const form = document.getElementById("inspection-form");
const sectionsRoot = document.getElementById("inspection-sections");
const saveStatus = document.getElementById("save-status");
const resultMessage = document.getElementById("result-message");
const jobLocationSelect = document.getElementById("job-location");
const submitButton = document.getElementById("submit-button");
const successPanel = document.getElementById("success-panel");
const successMessage = document.getElementById("success-message");
const newEntryButton = document.getElementById("new-entry-button");
const storageKey = "fall-protection-inspection-draft-v1";

bootstrap().catch((error) => {
  console.error(error);
  saveStatus.textContent = "Could not load the inspection form.";
});

async function bootstrap() {
  const response = await fetch("/api/schema");
  const schema = await response.json();

  renderJobLocations(schema.jobLocations || []);
  renderInspectionSections(schema.sectionGroups, schema.defaults);
  hydrateDraft();

  const dateInput = form.elements.namedItem("inspectionDate");
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  form.addEventListener("input", debounce(handleDraftSave, 250));
  form.addEventListener("change", debounce(handleDraftSave, 250));
  form.addEventListener("submit", handleSubmit);
  newEntryButton.addEventListener("click", resetForNextEntry);
}

function renderJobLocations(jobLocations) {
  jobLocations.forEach((jobLocation) => {
    const option = document.createElement("option");
    option.value = jobLocation;
    option.textContent = jobLocation;
    jobLocationSelect.appendChild(option);
  });
}

function renderInspectionSections(sectionGroups, defaults) {
  const groupTemplate = document.getElementById("group-template");
  const subsectionTemplate = document.getElementById("subsection-template");
  const itemTemplate = document.getElementById("item-template");

  sectionGroups.forEach((group) => {
    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    groupNode.querySelector("h2").textContent = group.title;
    const subsectionsRoot = groupNode.querySelector(".subsections");

    group.sections.forEach((section) => {
      const subsectionNode = subsectionTemplate.content.firstElementChild.cloneNode(true);
      subsectionNode.querySelector("h3").textContent = section.title;
      const checklistRoot = subsectionNode.querySelector(".checklist");

      section.items.forEach((item) => {
        const itemNode = itemTemplate.content.firstElementChild.cloneNode(true);
        const label = itemNode.querySelector(".item-label");
        label.textContent = item;

        const key = `${group.title}__${section.title}__${item}`;
        itemNode.dataset.fieldKey = key;

        itemNode.querySelectorAll("input[type=radio]").forEach((input) => {
          input.name = `inspection.${key}`;
          input.checked = input.value === defaults[key];
        });

        checklistRoot.appendChild(itemNode);
      });

      subsectionsRoot.appendChild(subsectionNode);
    });

    sectionsRoot.appendChild(groupNode);
  });
}

function hydrateDraft() {
  const rawDraft = localStorage.getItem(storageKey);
  if (!rawDraft) {
    return;
  }

  try {
    const draft = JSON.parse(rawDraft);
    Object.entries(draft).forEach(([name, value]) => {
      const control = form.elements.namedItem(name);

      if (!control) {
        return;
      }

      if (control instanceof RadioNodeList) {
        control.value = value;
        return;
      }

      control.value = value;
    });

    saveStatus.textContent = `Draft restored from ${new Date().toLocaleTimeString()}.`;
  } catch (error) {
    console.warn("Unable to restore draft", error);
  }
}

function collectFlatFormValues() {
  const flat = {};
  const data = new FormData(form);

  for (const [name, value] of data.entries()) {
    flat[name] = value;
  }

  return flat;
}

function handleDraftSave() {
  localStorage.setItem(storageKey, JSON.stringify(collectFlatFormValues()));
  saveStatus.textContent = `Draft autosaved at ${new Date().toLocaleTimeString()}.`;
}

async function handleSubmit(event) {
  event.preventDefault();
  resultMessage.textContent = "";
  saveStatus.textContent = "Submitting inspection...";
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const payload = buildSubmissionPayload();
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    saveStatus.textContent = "Submission failed.";
    resultMessage.textContent = result.error || "Could not submit inspection.";
    submitButton.disabled = false;
    submitButton.textContent = "Submit Inspection";
    return;
  }

  localStorage.removeItem(storageKey);
  showSuccessState(result);
}

function buildSubmissionPayload() {
  const flat = collectFlatFormValues();
  const payload = {
    text: {
      projectName: flat.projectName || "",
      equipmentAssignedTo: flat.equipmentAssignedTo || "",
      inspector: flat.inspector || "",
      inspectionDate: flat.inspectionDate || "",
      comments: flat.comments || ""
    },
    equipment: [0, 1].map((index) => ({
      typeMakeModel: flat[`equipment.${index}.typeMakeModel`] || "",
      serialNumber: flat[`equipment.${index}.serialNumber`] || "",
      lotNumber: flat[`equipment.${index}.lotNumber`] || ""
    })),
    inspections: {}
  };

  Object.entries(flat).forEach(([name, value]) => {
    if (!name.startsWith("inspection.")) {
      return;
    }

    payload.inspections[name.slice("inspection.".length)] = value;
  });

  return payload;
}

function debounce(fn, wait) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

function showSuccessState(result) {
  const uploadText = result.uploadedToDropbox
    ? `The PDF uploaded to Dropbox at ${result.dropboxPath}.`
    : "The PDF was created, but Dropbox upload is not configured yet.";

  saveStatus.textContent = "Inspection submitted successfully.";
  resultMessage.textContent = result.message;
  successMessage.textContent = `${uploadText} File name: ${result.fileName}.`;
  form.hidden = true;
  successPanel.hidden = false;
}

function resetForNextEntry() {
  successPanel.hidden = true;
  form.hidden = false;
  form.reset();
  submitButton.disabled = false;
  submitButton.textContent = "Submit Inspection";
  saveStatus.textContent = "Draft autosaves in this browser.";
  resultMessage.textContent = "";
  form.elements.namedItem("inspectionDate").value = new Date().toISOString().slice(0, 10);
  document.querySelectorAll("input[type=radio][value='na']").forEach((input) => {
    input.checked = true;
  });
}
