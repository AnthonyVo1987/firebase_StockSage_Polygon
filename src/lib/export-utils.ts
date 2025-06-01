
/**
 * @fileOverview Utility functions for data exporting (JSON, Text, CSV), downloading, and copying to clipboard.
 */
import type { AnalyzeStockDataOutput } from '@/ai/schemas/stock-analysis-schemas'; // Ensure this type is available
import type { ToastProps } from '@/components/ui/toast'; // For toast function signature

type ToastFunction = (props: Omit<ToastProps, "id">) => void;

/**
 * Generates a timestamp string for filenames.
 * @returns string e.g., "20240730_153045"
 */
export function getCurrentTimestampForFile(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

/**
 * Escapes a field for CSV output if it contains commas, newlines, or quotes.
 * @param field - The data to escape.
 * @returns The escaped string.
 */
export function escapeCsvField(field: any): string {
  const stringField = String(field === null || field === undefined ? '' : field);
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

/**
 * Formats data (string or object) into a pretty-printed JSON string for export.
 * @param data - The data to format.
 * @returns A pretty-printed JSON string.
 */
export function formatJsonForExport(data: any): string {
  let dataString: string;
  if (typeof data === 'string') {
    try {
      dataString = JSON.stringify(JSON.parse(data), null, 2);
    } catch (e) {
      dataString = data; // Assume it's already formatted or non-JSON string
    }
  } else {
    dataString = JSON.stringify(data, null, 2);
  }
  console.log(`[ExportUtils:FormatJSON] Input type: ${typeof data}. Output length: ${dataString.length}`);
  return dataString;
}

/**
 * Converts stock JSON string to CSV format.
 * @param jsonString - The stock data as a JSON string.
 * @returns A string in CSV format.
 */
function stockJsonToCsv(jsonString: string): string {
  try {
    const data = JSON.parse(jsonString);
    let csvRows = ["Category,Property,Value,Period,Signal,Histogram"];

    if (data.marketStatus) {
      for (const [key, value] of Object.entries(data.marketStatus)) {
        if (typeof value === 'object' && value !== null) {
          for (const [subKey, subValue] of Object.entries(value)) {
            csvRows.push(`MarketStatus,${escapeCsvField(key + '.' + subKey)},${escapeCsvField(subValue)},,,,`);
          }
        } else {
          csvRows.push(`MarketStatus,${escapeCsvField(key)},${escapeCsvField(value)},,,,`);
        }
      }
    }

    if (data.stockQuote) {
      for (const [key, value] of Object.entries(data.stockQuote)) {
        csvRows.push(`StockQuote,${escapeCsvField(key)},${escapeCsvField(value)},,,,`);
      }
    }

    if (data.technicalAnalysis) {
      for (const [taKey, taValueObj] of Object.entries(data.technicalAnalysis as Record<string, any>)) {
        if (taValueObj && typeof taValueObj === 'object') {
          if (taKey === 'macd') {
            csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},${escapeCsvField((taValueObj as any).value)},,${escapeCsvField((taValueObj as any).signal)},${escapeCsvField((taValueObj as any).histogram)}`);
          } else {
            for (const [period, value] of Object.entries(taValueObj)) {
              csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},${escapeCsvField(value)},${escapeCsvField(period)},,`);
            }
          }
        } else {
          csvRows.push(`TechnicalAnalysis,${escapeCsvField(taKey)},N/A,,,,`);
        }
      }
    }
    return csvRows.join("\n");
  } catch (e) {
    console.error("[ExportUtils:StockToCSV] Error parsing stockJson for CSV:", e);
    return "Error: Could not parse stock JSON for CSV.";
  }
}

/**
 * Converts AI analysis output to CSV format.
 * @param analysis - The AI analysis object.
 * @returns A string in CSV format.
 */
function analysisToCsv(analysis: AnalyzeStockDataOutput): string {
  let csvRows = ["Category,Sentiment,Takeaway"];
  for (const [key, valueObj] of Object.entries(analysis)) {
    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
    csvRows.push(`${escapeCsvField(formattedKey)},${escapeCsvField(valueObj.sentiment)},${escapeCsvField(valueObj.text)}`);
  }
  return csvRows.join("\n");
}

/**
 * Converts a generic record of all page data to CSV format by flattening the object.
 * @param data - The combined page data object.
 * @returns A string in CSV format.
 */
function allPageDataToCsv(data: Record<string, any>): string {
  let csvRows = ["Property,Value"];
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      const newKey = pre + k;
      if (k === 'analysis' && obj[k] && typeof obj[k] === 'object') {
        Object.entries(obj[k] as AnalyzeStockDataOutput).forEach(([takeawayKey, takeawayValue]) => {
          acc[`${newKey}.${takeawayKey}.text`] = takeawayValue.text;
          acc[`${newKey}.${takeawayKey}.sentiment`] = takeawayValue.sentiment;
        });
      } else if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]) && Object.keys(obj[k]).length > 0) {
        Object.assign(acc, flattenObject(obj[k], newKey));
      } else if (obj[k] !== undefined) {
        acc[newKey] = obj[k];
      }
      return acc;
    }, {} as Record<string, any>);
  };

  const flatData = flattenObject(data);
  for (const [key, value] of Object.entries(flatData)) {
    csvRows.push(`${escapeCsvField(key)},${escapeCsvField(value)}`);
  }
  return csvRows.join("\n");
}

/**
 * Converts data to CSV format based on a dataTypeHint.
 * @param data - The data to convert.
 * @param titleForCsv - The title (unused in current CSV logic, but kept for signature consistency).
 * @param dataTypeHint - Hints at the type of data for specific CSV conversion.
 * @returns A string in CSV format.
 */
export function convertToCsvForExport(
  data: any,
  titleForCsv: string, // Kept for consistent signature, though might not be used by all specific converters
  dataTypeHint?: 'stockJson' | 'analysis' | 'allPageData'
): string {
  let result: string;
  if (dataTypeHint === 'stockJson' && typeof data === 'string') {
    result = stockJsonToCsv(data);
  } else if (dataTypeHint === 'analysis' && typeof data === 'object' && data !== null) {
    result = analysisToCsv(data as AnalyzeStockDataOutput);
  } else if (dataTypeHint === 'allPageData' && typeof data === 'object' && data !== null) {
    result = allPageDataToCsv(data);
  } else {
    // Fallback for generic data or if hint is not provided/matched
    if (typeof data === 'object' && data !== null) result = JSON.stringify(data);
    else result = String(data);
  }
  console.log(`[ExportUtils:FormatCSV] Title: "${titleForCsv}". DataTypeHint: "${dataTypeHint}". Input type: ${typeof data}. Output length: ${result.length}`);
  return result;
}

/**
 * Converts data to a plain text string format.
 * @param data - The data to convert.
 * @param title - The title for the text section.
 * @returns A string in plain text format.
 */
export function convertToTextForExport(data: any, title: string): string {
  let textContent = `${title.toUpperCase()}\n====================================\n`;
  if (title === "AI Key Takeaways" && typeof data === 'object' && data !== null) {
    const analysisData = data as AnalyzeStockDataOutput;
    Object.entries(analysisData).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
      textContent += `${formattedKey} (Sentiment: ${value.sentiment}):\n${value.text}\n\n`;
    });
  } else if (typeof data === 'string') {
    try {
      textContent += JSON.stringify(JSON.parse(data), null, 2);
    } catch (e) {
      textContent += data; // If it's not JSON, just append the string
    }
  } else if (typeof data === 'object' && data !== null) {
    textContent += JSON.stringify(data, null, 2);
  } else {
    textContent += String(data);
  }
  console.log(`[ExportUtils:FormatText] Title: "${title}". Input type: ${typeof data}. Output length: ${textContent.length}`);
  return textContent;
}

/**
 * Triggers a browser download for the given content.
 * @param content - The string content to download.
 * @param filename - The desired filename for the download.
 * @param mimeType - The MIME type of the content (e.g., 'application/json', 'text/plain').
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  console.log(`[ExportUtils:Download] Initiating download. Filename: "${filename}", MimeType: "${mimeType}", Content length: ${content.length}`);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to the clipboard and shows a toast notification.
 * @param text - The text to copy.
 * @param toastFn - The toast function from useToast.
 * @param contentType - A descriptive name for the content being copied (e.g., "Stock Data").
 */
export async function copyToClipboardUtil(
  text: string,
  toastFn: ToastFunction,
  contentType: string
): Promise<void> {
  console.log(`[ExportUtils:Copy] Attempting to copy. ContentType: "${contentType}", Text length: ${text.length}`);
  try {
    await navigator.clipboard.writeText(text);
    toastFn({ title: "Copied to Clipboard", description: `${contentType} copied successfully.` });
    console.log(`[ExportUtils:Copy] Successfully copied: "${contentType}"`);
  } catch (err: any) {
    console.error(`[ExportUtils:Copy] FAILED to copy: "${contentType}". Error: ${err.message}`, err);
    toastFn({ variant: "destructive", title: "Copy Failed", description: `Could not copy ${contentType} to clipboard.` });
  }
}

