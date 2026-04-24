const fs = require("fs/promises");
const path = require("path");
const { app } = require("../server");

async function main() {
  const server = app.listen(3100);

  try {
    const response = await fetch("http://127.0.0.1:3100/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: {
          projectName: "North Stair Tower",
          equipmentAssignedTo: "Crew A",
          inspector: "Alex Sample",
          inspectionDate: "2026-04-24",
          comments: "Smoke test submission."
        },
        equipment: [
          {
            typeMakeModel: "Harness Pro X",
            serialNumber: "HPX-100",
            lotNumber: "L-22"
          },
          {
            typeMakeModel: "SRL 30ft",
            serialNumber: "SRL-200",
            lotNumber: "L-23"
          }
        ],
        inspections: {
          "Harness/Lanyards/Anchor Points__1. Hardware__Rust/Corrosion": "pass",
          "Harness/Lanyards/Anchor Points__1. Hardware__Burrs/cracks": "fail",
          "Horizontal and Self-Retracting Lifelines__5. Connectors__Impact indicator": "pass"
        }
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Submission failed");
    }

    const exists = await fs
      .access(path.join(process.cwd(), "output", result.fileName))
      .then(() => true)
      .catch(() => false);

    console.log(JSON.stringify({ ok: true, fileName: result.fileName, outputExists: exists }));
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
