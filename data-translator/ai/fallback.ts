import type { ColumnDataProfile, SemanticVariable } from "@/types/data-translator";

export type AiFallbackSuggestion = {
  suggestion: SemanticVariable | null;
  reasons: string[];
};

export function suggestWithAiFallback(sourceHeader: string, profile?: ColumnDataProfile): AiFallbackSuggestion {
  return {
    suggestion: null,
    reasons: [
      "IA deshabilitada en el MVP: no hay backend, APIs reales ni envio de datos.",
      `Encabezado pendiente: ${sourceHeader}`,
      profile ? `Tipo local detectado: ${profile.detectedTypes.join(", ")}` : "Sin perfil de datos disponible.",
    ],
  };
}
