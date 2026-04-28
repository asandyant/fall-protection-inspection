const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { jobLocations, sectionGroups, getBlankInspectionValues } = require("./src/formSchema");

const app = express();
const port = Number(process.env.PORT || 3000);
const assetsDir = path.join(__dirname, "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(assetsDir));

app.get("/api/schema", (_req, res) => {
  res.json({
    jobLocations,
    sectionGroups,
    defaults: getBlankInspectionValues()
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/submissions", async (req, res) => {
  try {
    const submission = normalizeSubmission(req.body);
    const pdfBytes = await buildInspectionPdf(submission);

    const fileName = buildFileName(submission);
    const localDir = path.join(__dirname, "output");
    const localFile = path.join(localDir, fileName);

    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(localFile, pdfBytes);

    const uploadResult = await uploadToDropbox({
      fileName,
      pdfBytes,
      submission
    });

    res.json({
      ok: true,
      fileName,
      localPath: localFile,
      uploadedToDropbox: uploadResult.uploaded,
      dropboxPath: uploadResult.path || null,
      message: uploadResult.uploaded
        ? "Inspection submitted and uploaded to Dropbox."
        : "Inspection submitted. Dropbox upload skipped because credentials are not configured."
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      ok: false,
      error: error.message || "Failed to submit inspection."
    });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Fall protection inspection app running on port ${port}`);
  });
}

function normalizeSubmission(body) {
  const text = body?.text || {};
  const inspections = body?.inspections || {};
  const equipment = Array.isArray(body?.equipment) ? body.equipment.slice(0, 2) : [];
  const normalizedEquipment = [0, 1].map((index) => ({
    typeMakeModel: cleanText(equipment[index]?.typeMakeModel),
    serialNumber: cleanText(equipment[index]?.serialNumber),
    lotNumber: cleanText(equipment[index]?.lotNumber)
  }));

  const normalized = {
    projectName: cleanText(text.projectName),
    equipmentAssignedTo: cleanText(text.equipmentAssignedTo),
    inspector: cleanText(text.inspector),
    inspectionDate: cleanDate(text.inspectionDate),
    comments: cleanText(text.comments),
    equipment: normalizedEquipment,
    inspections: {}
  };

  const defaults = getBlankInspectionValues();
  for (const key of Object.keys(defaults)) {
    const value = inspections[key];
    normalized.inspections[key] = ["pass", "fail", "na"].includes(value) ? value : "na";
  }

  if (!normalized.projectName) {
    throw new Error("Project name is required.");
  }

  if (!normalized.equipmentAssignedTo) {
    throw new Error("Equipment assigned to is required.");
  }

  if (!normalized.inspector) {
    throw new Error("Inspector is required.");
  }

  return normalized;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 500);
}

function cleanDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }

  return raw.slice(0, 10);
}

function buildFileName(submission) {
  const safeInspector = slugify(submission.inspector || "unknown");
  const safeProject = slugify(submission.projectName || "project");
  return `fall-inspection_${submission.inspectionDate}_${safeProject}_${safeInspector}.pdf`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

async function buildInspectionPdf(submission) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  let cursorY = 758;

  const margins = {
    left: 42,
    right: 570
  };

  const palette = {
    ink: rgb(0.09, 0.13, 0.16),
    soft: rgb(0.36, 0.41, 0.45),
    line: rgb(0.83, 0.86, 0.88),
    accent: rgb(0.1, 0.35, 0.62),
    fail: rgb(0.73, 0.16, 0.18)
  };

  const ensureSpace = (needed) => {
    if (cursorY - needed >= 50) {
      return;
    }

    page = pdf.addPage([612, 792]);
    cursorY = 758;
  };

  const drawText = (text, x, y, options = {}) => {
    page.drawText(text, {
      x,
      y,
      size: options.size || 10,
      font: options.font || font,
      color: options.color || palette.ink
    });
  };

  const drawWrapped = (text, x, y, width, options = {}) => {
    const size = options.size || 10;
    const selectedFont = options.font || font;
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = selectedFont.widthOfTextAtSize(candidate, size);

      if (candidateWidth <= width || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const lineHeight = size + 3;
    lines.forEach((line, index) => {
      drawText(line, x, y - index * lineHeight, { ...options, size, font: selectedFont });
    });

    return lines.length * lineHeight;
  };

  const checkboxLabel = {
    pass: "PASS",
    fail: "FAIL",
    na: "N/A"
  };

  const drawStatusRow = (label, status, x, y, widths) => {
    const labelHeight = drawWrapped(label, x, y, widths.labelWidth, {
      size: 9.5,
      color: palette.ink
    });

    let boxX = x + widths.labelWidth + 8;
    ["pass", "fail", "na"].forEach((option) => {
      page.drawRectangle({
        x: boxX,
        y: y - 8,
        width: 10,
        height: 10,
        borderColor: option === "fail" && status === "fail" ? palette.fail : palette.soft,
        borderWidth: 1
      });

      if (status === option) {
        drawText("X", boxX + 2, y - 6, {
          size: 9,
          font: boldFont,
          color: option === "fail" ? palette.fail : palette.accent
        });
      }

      drawText(checkboxLabel[option], boxX + 14, y - 6, {
        size: 7.5,
        color: palette.soft
      });
      boxX += 44;
    });

    return Math.max(labelHeight, 18);
  };

  const drawHeaderBlock = (label, value, x, y, width) => {
    drawText(label, x, y, { size: 8, font: boldFont, color: palette.soft });
    page.drawRectangle({
      x,
      y: y - 20,
      width,
      height: 16,
      borderColor: palette.line,
      borderWidth: 1
    });
    drawWrapped(value || " ", x + 6, y - 11, width - 12, { size: 10 });
  };

  drawText("Fall Protection Inspection Checklist", margins.left, cursorY, {
    size: 18,
    font: boldFont,
    color: palette.accent
  });
  cursorY -= 24;
  drawText("Daily inspection form for field crews", margins.left, cursorY, {
    size: 10,
    color: palette.soft
  });
  cursorY -= 24;

  drawHeaderBlock("Project Name", submission.projectName, margins.left, cursorY, 250);
  drawHeaderBlock("Equipment Assigned To", submission.equipmentAssignedTo, 316, cursorY, 254);
  cursorY -= 34;

  submission.equipment.forEach((entry, index) => {
    drawHeaderBlock(
      `Equipment ${index + 1} Type/Make/Model`,
      entry.typeMakeModel,
      margins.left,
      cursorY,
      250
    );
    drawHeaderBlock(`Serial #`, entry.serialNumber, 316, cursorY, 122);
    drawHeaderBlock(`Lot #`, entry.lotNumber, 448, cursorY, 122);
    cursorY -= 34;
  });

  drawHeaderBlock("Inspector", submission.inspector, margins.left, cursorY, 250);
  drawHeaderBlock("Date", submission.inspectionDate, 316, cursorY, 254);
  cursorY -= 42;

  const columns = [
    { x: margins.left, width: 250 },
    { x: 316, width: 254 }
  ];

  sectionGroups.forEach((group, groupIndex) => {
    ensureSpace(90);

    const column = columns[groupIndex];
    let localY = cursorY;

    page.drawRectangle({
      x: column.x,
      y: localY - 16,
      width: column.width,
      height: 18,
      color: rgb(0.94, 0.96, 0.98)
    });
    drawText(group.title, column.x + 8, localY - 11, {
      size: 11,
      font: boldFont,
      color: palette.ink
    });
    localY -= 28;

    group.sections.forEach((section) => {
      drawText(section.title, column.x, localY, {
        size: 10,
        font: boldFont,
        color: palette.accent
      });
      localY -= 16;

      section.items.forEach((item) => {
        const key = `${group.title}__${section.title}__${item}`;
        const consumed = drawStatusRow(item, submission.inspections[key], column.x, localY, {
          labelWidth: column.width - 146
        });
        localY -= consumed;
      });

      localY -= 6;
    });

    if (groupIndex === 0) {
      cursorY = localY;
    } else {
      cursorY = Math.min(cursorY, localY);
    }
  });

  cursorY -= 10;
  ensureSpace(120);

  drawText("Comments / Action Items", margins.left, cursorY, {
    size: 11,
    font: boldFont,
    color: palette.accent
  });
  cursorY -= 16;
  page.drawRectangle({
    x: margins.left,
    y: cursorY - 70,
    width: margins.right - margins.left,
    height: 72,
    borderColor: palette.line,
    borderWidth: 1
  });
  drawWrapped(submission.comments || "None provided.", margins.left + 8, cursorY - 12, 510, {
    size: 10
  });

  drawText(
    "Remove damaged equipment from service immediately and report it to a supervisor. Fall protection involved in an arrest event must be destroyed immediately.",
    margins.left,
    26,
    {
      size: 8,
      color: palette.soft
    }
  );

  return Buffer.from(await pdf.save());
}

async function uploadToDropbox({ fileName, pdfBytes, submission }) {
  const accessToken = await getDropboxAccessToken();
  const rootPath = process.env.DROPBOX_ROOT_PATH || "/Safety/Fall Protection Inspections";

  if (!accessToken) {
    return { uploaded: false, path: null };
  }

  const folderPath = `${rootPath}/${submission.inspectionDate.slice(0, 7).replace("-", "/")}`;
  const fullPath = `${folderPath}/${fileName}`.replace(/\/+/g, "/");

  await createDropboxFolder(folderPath, accessToken);

  const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: fullPath,
        mode: "add",
        autorename: true,
        mute: false,
        strict_conflict: false
      })
    },
    body: pdfBytes
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Dropbox upload failed: ${details}`);
  }

  return {
    uploaded: true,
    path: fullPath
  };
}

async function getDropboxAccessToken() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (refreshToken && appKey && appSecret) {
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret
      })
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      throw new Error(`Dropbox token refresh failed: ${details}`);
    }

    const tokenPayload = await tokenResponse.json();
    return tokenPayload.access_token || null;
  }

  return process.env.DROPBOX_ACCESS_TOKEN || null;
}

async function createDropboxFolder(folderPath, accessToken) {
  const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: folderPath,
      autorename: false
    })
  });

  if (response.ok) {
    return;
  }

  const details = await response.text();
  if (details.includes("conflict")) {
    return;
  }

  throw new Error(`Dropbox folder creation failed: ${details}`);
}

module.exports = {
  app,
  buildInspectionPdf,
  normalizeSubmission,
  uploadToDropbox
};
