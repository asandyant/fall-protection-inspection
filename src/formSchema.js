const SECTION_GROUPS = [
  {
    title: "Harness/Lanyards/Anchor Points",
    sections: [
      {
        title: "1. Hardware",
        items: [
          "Rust/Corrosion",
          "Deformed/bent",
          "Burrs/cracks",
          "Weld spots/slag",
          "Missing rivets",
          "Springs",
          "Functionality",
          "Other"
        ]
      },
      {
        title: "2. Webbing",
        items: [
          "Cuts/burns/holes",
          "Excessive wear",
          "Excessive UV damage",
          "Chemical damage",
          "Other"
        ]
      },
      {
        title: "3. Stitching",
        items: [
          "Missing",
          "Loose",
          "Broken",
          "Other"
        ]
      },
      {
        title: "4. Cable",
        items: [
          "Rust/corrosion",
          "Chemical damage",
          "Cable spreading/Birdcaging",
          "Broken wire strands/Arc Damage",
          "Links/bent strands",
          "Other"
        ]
      },
      {
        title: "5. Labels/Tags",
        items: [
          "Missing",
          "Illegible",
          "Dates",
          "Other"
        ]
      }
    ]
  },
  {
    title: "Horizontal and Self-Retracting Lifelines",
    sections: [
      {
        title: "1. Labels & Markings",
        items: [
          "Label (Intact & Legible)",
          "Appropriate ANSI/OSHA markings",
          "Inspections current",
          "Other"
        ]
      },
      {
        title: "2. Shock Pack (if present)",
        items: [
          "Cover/Shrink Pack",
          "Damage/Fraying/Broken Stitching",
          "Impact indicator",
          "Other"
        ]
      },
      {
        title: "3. Housing",
        items: [
          "Attachment Point",
          "Nuts/Bolts/Rivets/Screws",
          "Evidence of damage (dents/cracks/rust)",
          "Other"
        ]
      },
      {
        title: "4. Lifeline (Web or Cable)",
        items: [
          "Termination (Stitch, Splice, etc)",
          "Cuts/Fraying/Broken Stitching",
          "Excessive Wear",
          "Rust/corrosion",
          "Chemical Damage",
          "Cable Spreading/Birdcaging",
          "Broken wire strands/Arc Damage",
          "Retraction function",
          "Braking/Locking function",
          "Other"
        ]
      },
      {
        title: "5. Connectors",
        items: [
          "Connector (self-closing/locking)",
          "Impact indicator",
          "Hook body/Rivets",
          "Corrosion/Pitting/Nicks",
          "Other"
        ]
      }
    ]
  }
];

const JOB_LOCATIONS = [
  "Devon Bridge",
  "RK-19",
  "HBKBQE",
  "Mass Dot Tank",
  "Gold Star Memorial",
  "C-35311 Dyer Ave",
  "Simon Kenton Bridge",
  "VN Ramps",
  "90008470/Pulaski Cotract 8B",
  "GWB-244.048/GWB Cables",
  "Macombs Dam",
  "K7279 & K6176/ Gordie Howe",
  "BW-96 & VN-12 Whitestone Hellman Platforms",
  "BRX9579/Boston Road",
  "BRC231F/Queensboro Bridge",
  "BQE From Atlantic Ave. To Sands St. Interim Rehabilitation 2",
  "Mid Hudson Approach",
  "GWB-244.289/Lemoine Avenue",
  "Park Avenue",
  "RK-90",
  "69th ST",
  "HBX1190/Grand Concourse Bridge",
  "NYC W.O. #3",
  "D264965/D265046 WW",
  "SAANDHBFDR/ Sandy Relief Tully",
  "ECMS 117244 Spot Painting",
  "Suffolk County ARC Molecular&Polymer and ARC Surface Prep/ARC Molecular&Polymer and ARC Surface Prep",
  "D265343 Bove W&W2",
  "D265307 WO 03",
  "Governors Island"
];

function getBlankInspectionValues() {
  const values = {};

  for (const group of SECTION_GROUPS) {
    for (const section of group.sections) {
      for (const item of section.items) {
        const key = `${group.title}__${section.title}__${item}`;
        values[key] = "na";
      }
    }
  }

  return values;
}

module.exports = {
  jobLocations: JOB_LOCATIONS,
  sectionGroups: SECTION_GROUPS,
  getBlankInspectionValues
};
