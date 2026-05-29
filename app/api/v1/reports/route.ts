import { auth } from "@/lib/auth/auth";
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { fail, handleApiError } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { parsePeriod } from "@/lib/period";
import { getReportData } from "@/lib/services/report-export-service";

function csvResponse(fileName: string, header: string[], lines: Array<Array<unknown>>) {
  const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function xlsxResponse(fileName: string, header: string[], lines: Array<Array<unknown>>) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...lines]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function pdfResponse(fileName: string, title: string, header: string[], lines: Array<Array<unknown>>) {
  const content = [
    title,
    "",
    header.join(" | "),
    ...lines.slice(0, 120).map((line) => line.map((cell) => String(cell ?? "").slice(0, 28)).join(" | "))
  ];
  const pdf = createSimplePdf(content);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function reportResponse(format: string | null, baseName: string, title: string, header: string[], lines: Array<Array<unknown>>) {
  if (format === "xlsx") return xlsxResponse(`${baseName}.xlsx`, header, lines);
  if (format === "pdf") return pdfResponse(`${baseName}.pdf`, title, header, lines);
  return csvResponse(`${baseName}.csv`, header, lines);
}

function createSimplePdf(lines: string[]) {
  const objects: string[] = [];
  const pageObjects: number[] = [];
  const escapedLines = lines.map(escapePdfText);
  const chunks = chunk(escapedLines, 38);
  const logo = readPdfLogo();

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const logoObjectNumber = logo ? objects.length + 1 : null;
  if (logo) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n${logo.data.toString("binary")}\nendstream`);
  }

  for (const pageLines of chunks) {
    const logoWidth = 82;
    const logoHeight = logo ? Math.max(24, Math.round((logo.height / logo.width) * logoWidth)) : 0;
    const logoCommands = logo ? [`q`, `${logoWidth} 0 0 ${logoHeight} 42 ${800 - logoHeight} cm`, `/Logo Do`, `Q`] : [];
    const content = [
      ...logoCommands,
      "BT",
      "/F1 10 Tf",
      `42 ${logo ? 770 - logoHeight : 800} Td`,
      "14 TL",
      ...pageLines.map((line, index) => `${index === 0 ? "" : "T* " }(${line}) Tj`),
      "ET"
    ].join("\n");
    const contentObjectNumber = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageObjectNumber = objects.length + 1;
    const xObject = logoObjectNumber ? `/XObject << /Logo ${logoObjectNumber} 0 R >>` : "";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> ${xObject} >> /Contents ${contentObjectNumber} 0 R >>`);
    pageObjects.push(pageObjectNumber);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjects.map((objectNumber) => `${objectNumber} 0 R`).join(" ")}] /Count ${pageObjects.length} >>`;

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, "binary");
}

function readPdfLogo() {
  try {
    const data = readFileSync(path.join(process.cwd(), "public", "images", "logo-smg.jfif"));
    const dimensions = getJpegDimensions(data);
    if (!dimensions) return null;
    return { data, ...dimensions };
  } catch {
    return null;
  }
}

function getJpegDimensions(data: Buffer) {
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }
  return null;
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks.length ? chunks : [[]];
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Login necessario.", 401);
    if (!hasPermission(session.user, "finance.export")) return fail("FORBIDDEN", "Permissao insuficiente.", 403);

    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const period = parsePeriod({
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined
    });
    const report = await getReportData(url.searchParams.get("type"), period, url.searchParams.get("view"));

    return reportResponse(format, report.fileName, report.title, report.header, report.rows);
  } catch (error) {
    return handleApiError(error);
  }
}
