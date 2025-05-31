
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileJson2, FileText, Sheet, Download, ClipboardCopy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentTimestampForFile,
  formatJsonForExport,
  convertToTextForExport,
  convertToCsvForExport,
  downloadFile,
  copyToClipboardUtil
} from '@/lib/export-utils';

interface DataExportControlsProps {
  data: any;
  baseFilename: string;
  titleForTextAndCsv: string;
  isAvailable: boolean;
  getTickerSymbolForFilename: () => string; // Function to get current ticker
  dataTypeHintForCsv?: 'stockJson' | 'analysis' | 'allPageData';
}

export default function DataExportControls({
  data,
  baseFilename,
  titleForTextAndCsv,
  isAvailable,
  getTickerSymbolForFilename,
  dataTypeHintForCsv
}: DataExportControlsProps) {
  const { toast } = useToast();

  const handleDownload = (format: 'json' | 'text' | 'csv') => {
    if (!data) {
        toast({ variant: "destructive", title: "No Data", description: "No data available to download."});
        return;
    }
    const ticker = getTickerSymbolForFilename();
    const timestamp = getCurrentTimestampForFile();
    const filenamePrefix = `${baseFilename}_${ticker}_${timestamp}`;
    let fileContent: string;
    let mimeType: string;
    let fullFilename: string;

    switch (format) {
      case 'json':
        fileContent = formatJsonForExport(data);
        mimeType = 'application/json';
        fullFilename = `${filenamePrefix}.json`;
        break;
      case 'text':
        fileContent = convertToTextForExport(data, titleForTextAndCsv);
        mimeType = 'text/plain;charset=utf-8;';
        fullFilename = `${filenamePrefix}.txt`;
        break;
      case 'csv':
        fileContent = convertToCsvForExport(data, titleForTextAndCsv, dataTypeHintForCsv);
        mimeType = 'text/csv;charset=utf-8;';
        fullFilename = `${filenamePrefix}.csv`;
        break;
      default:
        toast({ variant: "destructive", title: "Error", description: "Invalid download format."});
        return;
    }
    downloadFile(fileContent, fullFilename, mimeType);
    toast({ title: "Download Started", description: `${fullFilename} is downloading.` });
  };

  const handleCopyToClipboard = async (format: 'json' | 'text' | 'csv') => {
    if (!data) {
        toast({ variant: "destructive", title: "No Data", description: "No data available to copy."});
        return;
    }
    let textToCopy: string;
    let contentTypeDesc: string;

    switch (format) {
      case 'json':
        textToCopy = formatJsonForExport(data);
        contentTypeDesc = `${titleForTextAndCsv} (JSON)`;
        break;
      case 'text':
        textToCopy = convertToTextForExport(data, titleForTextAndCsv);
        contentTypeDesc = `${titleForTextAndCsv} (Text)`;
        break;
      case 'csv':
        textToCopy = convertToCsvForExport(data, titleForTextAndCsv, dataTypeHintForCsv);
        contentTypeDesc = `${titleForTextAndCsv} (CSV)`;
        break;
      default:
        toast({ variant: "destructive", title: "Error", description: "Invalid copy format."});
        return;
    }
    await copyToClipboardUtil(textToCopy, toast, contentTypeDesc);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownload('json')}
        disabled={!isAvailable}
        title={`Export ${titleForTextAndCsv} as JSON`}
      >
        <Download className="h-4 w-4 mr-1" /> JSON
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCopyToClipboard('json')}
        disabled={!isAvailable}
        title={`Copy ${titleForTextAndCsv} as JSON`}
      >
        <ClipboardCopy className="h-4 w-4 mr-1" /> JSON
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownload('text')}
        disabled={!isAvailable}
        title={`Export ${titleForTextAndCsv} as Text`}
      >
        <FileText className="h-4 w-4 mr-1" /> Text
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCopyToClipboard('text')}
        disabled={!isAvailable}
        title={`Copy ${titleForTextAndCsv} as Text`}
      >
        <ClipboardCopy className="h-4 w-4 mr-1" /> Text
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownload('csv')}
        disabled={!isAvailable}
        title={`Export ${titleForTextAndCsv} as CSV`}
      >
        <Sheet className="h-4 w-4 mr-1" /> CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCopyToClipboard('csv')}
        disabled={!isAvailable}
        title={`Copy ${titleForTextAndCsv} as CSV`}
      >
        <ClipboardCopy className="h-4 w-4 mr-1" /> CSV
      </Button>
    </div>
  );
}
