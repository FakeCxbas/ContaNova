import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  onCSV: () => void;
  onExcel: () => void;
  onPDF: () => void;
  disabled?: boolean;
}

export function ExportMenu({ onCSV, onExcel, onPDF, disabled }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <Download className="h-4 w-4" />Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onPDF} className="gap-2">
          <FileText className="h-4 w-4 text-red-500" />PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCSV} className="gap-2">
          <File className="h-4 w-4 text-muted-foreground" />CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
