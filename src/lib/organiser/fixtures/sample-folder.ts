import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { docxWith, jpegWithExif, pdfWith } from "@/lib/files/fixtures/build-files";

/**
 * A made-up, Downloads-like folder for checking the Organiser against real models (phase 1:
 * "re-runs 12b against e4b on a sample-file set"). 48 files in 8 groups a person would make,
 * each tagged with the group it belongs in, so a run can be scored. Invented names and amounts —
 * no real person's data. Some pairs are deliberately close (a bill and a bank receipt).
 */
export const SAMPLE_CATEGORIES = [
  "Bills",
  "Banking and tax",
  "Photos",
  "Screenshots",
  "Installers",
  "Study",
  "Recipes",
  "Career",
] as const;
export type SampleCategory = (typeof SAMPLE_CATEGORIES)[number];

type Sample = { name: string; expected: SampleCategory; text?: string; photo?: { model: string; taken: string } };

export const SAMPLE_FILES: readonly Sample[] = [
  { name: "Invoice_0423_final.pdf", expected: "Bills", text: "Tax invoice no. 0423. Plumbing repairs. Total due $412.00 within 14 days." },
  { name: "electricity-bill-march-2026.pdf", expected: "Bills", text: "Your electricity bill for March. Amount payable $186.40 by 14 April." },
  { name: "mobile_bill_Aug.pdf", expected: "Bills", text: "Mobile plan monthly bill. Usage summary. Total $65.00 direct debit on 3 Sep." },
  { name: "invoice-INV-2291.pdf", expected: "Bills", text: "Invoice INV-2291 for web hosting, annual plan. Amount due $120.00." },
  { name: "water_rates_Q3.pdf", expected: "Bills", text: "Water and sewerage rates notice, quarter 3. Please pay $231.55." },
  { name: "internet_bill_september.pdf", expected: "Bills", text: "NBN internet 100 Mbps. Bill for September. Total payable $89.00." },

  { name: "Statement_Sep2026.pdf", expected: "Banking and tax", text: "Everyday account statement 1 Sep to 30 Sep 2026. Opening balance, closing balance, transactions." },
  { name: "notice_of_assessment_2025.pdf", expected: "Banking and tax", text: "Notice of assessment, year ended 30 June 2025. Taxable income. Refund amount." },
  { name: "payslip_2026-09-15.pdf", expected: "Banking and tax", text: "Payslip for period ending 15 Sep 2026. Gross pay, PAYG withholding, net pay, superannuation." },
  { name: "tax_return_summary_2025.pdf", expected: "Banking and tax", text: "Individual tax return summary 2025. Deductions claimed, tax offsets." },
  { name: "super_annual_statement.pdf", expected: "Banking and tax", text: "Superannuation annual member statement. Contributions, investment returns, balance." },
  { name: "transfer_receipt_1192.pdf", expected: "Banking and tax", text: "Bank transfer receipt 1192. Transferred $2,000.00 to savings account." },

  { name: "IMG_2001.jpg", expected: "Photos", photo: { model: "Pixel 8", taken: "2024:05:01 10:00:00" } },
  { name: "IMG_2002.jpg", expected: "Photos", photo: { model: "Pixel 8", taken: "2024:05:01 10:04:12" } },
  { name: "IMG_2017.jpg", expected: "Photos", photo: { model: "Pixel 8", taken: "2024:05:02 17:31:40" } },
  { name: "PXL_20250112_081530.jpg", expected: "Photos", photo: { model: "Pixel 8", taken: "2025:01:12 08:15:30" } },
  { name: "DSC_0442.jpg", expected: "Photos", photo: { model: "NIKON Z 50", taken: "2023:12:24 19:02:11" } },
  { name: "beach_sunset.jpg", expected: "Photos", photo: { model: "Pixel 8", taken: "2024:05:03 18:47:00" } },

  { name: "Screenshot 2026-09-12 101523.png", expected: "Screenshots" },
  { name: "Screenshot 2026-09-14 220104.png", expected: "Screenshots" },
  { name: "Screenshot 2026-10-01 090012.png", expected: "Screenshots" },
  { name: "Screenshot_20260815-131245.png", expected: "Screenshots" },
  { name: "Screen Shot 2026-07-03 at 4.12.55 pm.png", expected: "Screenshots" },
  { name: "snip_error_dialog.png", expected: "Screenshots" },

  { name: "OllamaSetup.exe", expected: "Installers" },
  { name: "vlc-3.0.21-win64.exe", expected: "Installers" },
  { name: "SteamSetup.exe", expected: "Installers" },
  { name: "python-3.13.1-amd64.exe", expected: "Installers" },
  { name: "VPNSetup_x64.msi", expected: "Installers" },
  { name: "Discord_setup.msi", expected: "Installers" },

  { name: "COMP2041_week3_notes.md", expected: "Study", text: "Week 3 lecture notes: shell scripting, pipes, regular expressions, sed and awk." },
  { name: "lecture-7-databases.docx", expected: "Study", text: "Lecture 7: relational databases, normal forms, joins and indexes. Tutorial questions." },
  { name: "assignment2_brief.pdf", expected: "Study", text: "Assignment 2 specification. Due week 9. Marking criteria and submission instructions." },
  { name: "exam_revision_list.txt", expected: "Study", text: "Final exam revision: past papers 2023 and 2024, topics to review, formulas sheet." },
  { name: "statistics_tutorial_5.pdf", expected: "Study", text: "Tutorial 5: hypothesis testing, p-values and confidence intervals. Exercises." },
  { name: "reading_list_semester2.md", expected: "Study", text: "Semester 2 reading list: required textbook chapters and recommended papers." },

  { name: "butter-chicken-recipe.txt", expected: "Recipes", text: "Butter chicken. Ingredients: chicken thighs, yoghurt, garam masala, butter, cream, tomato." },
  { name: "Mums dal recipe.docx", expected: "Recipes", text: "Dal tadka. Wash one cup of toor dal, boil with turmeric, temper with cumin and garlic." },
  { name: "banana_bread.md", expected: "Recipes", text: "Banana bread: 3 ripe bananas, flour, sugar, eggs, butter. Bake at 175C for 60 minutes." },
  { name: "pizza_dough.txt", expected: "Recipes", text: "Pizza dough: 500 g flour, 325 ml water, 10 g salt, 3 g yeast. Rest 24 hours." },
  { name: "chai_masala.txt", expected: "Recipes", text: "Chai masala blend: cardamom, cinnamon, cloves, black pepper, dry ginger." },
  { name: "weeknight_pasta.md", expected: "Recipes", text: "Garlic chilli pasta in 15 minutes: spaghetti, olive oil, garlic, chilli flakes, parsley." },

  { name: "CV_2026.docx", expected: "Career", text: "Curriculum vitae. Software developer. Experience, education, skills, references." },
  { name: "cover_letter_acme.docx", expected: "Career", text: "Dear hiring manager, I am applying for the junior developer role at Acme." },
  { name: "job_offer_letter.pdf", expected: "Career", text: "Letter of offer of employment. Position: Graduate Engineer. Start date and salary." },
  { name: "reference_letter.pdf", expected: "Career", text: "To whom it may concern, I am pleased to recommend this candidate, who worked with us." },
  { name: "interview_notes.md", expected: "Career", text: "Interview prep: tell me about yourself, strengths, a project I am proud of, questions to ask." },
  { name: "linkedin_profile_draft.txt", expected: "Career", text: "LinkedIn headline and about section draft. Open to work. Skills and endorsements." },
];

/** Writes the sample folder into `dir` (created if missing). Returns the files' expected categories by name. */
export async function writeSampleFolder(dir: string): Promise<Map<string, SampleCategory>> {
  mkdirSync(dir, { recursive: true });
  for (const s of SAMPLE_FILES) {
    const path = join(dir, s.name);
    const ext = s.name.split(".").at(-1)!.toLowerCase();
    if (s.photo) writeFileSync(path, jpegWithExif({ make: s.photo.model.startsWith("NIKON") ? "NIKON" : "Google", ...s.photo }));
    else if (ext === "pdf") writeFileSync(path, pdfWith(s.text ?? s.name));
    else if (ext === "docx") writeFileSync(path, await docxWith(s.text ?? s.name));
    else if (s.text) writeFileSync(path, s.text);
    // binaries: a distinct header per file, so no two hash the same
    else writeFileSync(path, Buffer.from(`${ext === "png" ? "\x89PNG\r\n\x1a\n" : "MZ"}${s.name}`, "latin1"));
  }
  return new Map(SAMPLE_FILES.map((s) => [s.name, s.expected]));
}
