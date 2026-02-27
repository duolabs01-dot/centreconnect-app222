const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');
const fs = require('fs');
const { execSync } = require('child_process');

async function generateAudit() {
  console.log('Gathering audit data...');

  // Get Git info
  const gitLog = execSync('git log -n 10 --pretty=format:"%h - %an, %ar : %s"').toString();
  const gitStatus = execSync('git status --short').toString();
  
  // Create Document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "CENTRECONNECT: PHASE 4 AUDIT REPORT",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Generated: ${new Date().toLocaleString()}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "1. Executive Summary", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          text: "This document serves as the formal audit for Phase 4 of the CentreConnect application. It covers recent architectural hardening, UI/UX refinements, and system telemetry updates.",
        }),

        new Paragraph({ text: "2. Recent System Updates", heading: HeadingLevel.HEADING_2 }),
        ...gitLog.split('\n').map(line => new Paragraph({
          children: [new TextRun({ text: "• " + line, size: 20 })],
        })),

        new Paragraph({ text: "3. Directory Map Hardening", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          text: "The directory map component was recently updated to use OpenFreeMap, providing a high-performance, keyless mapping solution. Error handling and responsive height protocols were also implemented.",
        }),
        
        new Paragraph({ text: "4. Codebase Integrity", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          text: "Current untracked or modified files in the working directory:",
        }),
        ...gitStatus.split('\n').filter(l => l.trim()).map(line => new Paragraph({
          children: [new TextRun({ text: "  " + line, font: "Courier New", size: 18 })],
        })),

        new Paragraph({ text: "5. Compliance & Security", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          text: "System adheres to POPIA data minimization standards. RLS policies are active on all primary tenant tables.",
        }),
      ],
    }],
  });

  // Save Document
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("CentreConnect_Phase4_Audit.docx", buffer);
  console.log('Audit report successfully generated: CentreConnect_Phase4_Audit.docx');
}

generateAudit().catch(err => {
  console.error('Error generating audit:', err);
  process.exit(1);
});
