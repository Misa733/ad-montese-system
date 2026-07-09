import type { PatrimonyAsset } from "./PatrimonyService";

export const PATRIMONY_SEED_ASSETS: PatrimonyAsset[] = [
  seedAsset({
    code: "ADM-02-AR-000001",
    description: "Templo - AR",
    congregation: "Ar",
    responsible: "José Edivan Sousa Rocha",
    location: "RUA W19, CASA 29 - ARATURI",
    documentation: "Sem documentacao informada",
    observations: "Bairro: Arianopoles / Caucaia - CE. CEP: 00.000-000. CPF: 144.081.473-20. RG: 982991.",
    sourceSheet: "Ar",
  }),
  seedAsset({
    code: "ADM-02-IA-000001",
    description: "Templo - IA",
    congregation: "IA",
    responsible: "JOSÉ FLAMARTINS BARROS DE FREITAS",
    location: "RUA CRUZEIRO DO SUL, Nº 205 - NOVA CIGANA",
    documentation: "Sem documentacao informada",
    observations: "Bairro: Nova Cigana. CEP: 61605730. CPF: 884.291.643-91. RG: 20083754282.",
    sourceSheet: "IA",
  }),
  seedAsset({
    code: "ADM-02-MR-000001",
    description: "Templo - MR",
    congregation: "MR",
    responsible: "LINDOMAR LIMA DA CONCEIÇÃO",
    location: "RUA E27, CASA 106 - PARQUE ARATURI",
    documentation: "Sem documentacao informada",
    observations: "Bairro: Marechal Rondon. CEP: 00.000-000. CPF: 328.172.403-59. RG: 2002010264026/SSP/Ce.",
    sourceSheet: "MR",
  }),
  seedAsset({
    code: "ADM-02-M3-000001",
    description: "Templo - M3",
    congregation: "M3",
    responsible: "GERALDO MANOEL DE ARAÚJO",
    location: "RUA JOÃO BEZERRA, Nº 1581 - CONJUNTO METROPOLITANO",
    documentation: "Sem Documentação",
    observations: "Bairro: patricia gomes. CEP: 00.000-000. CPF: 259.574.653-72. RG: 90002042770.",
    sourceSheet: "M3",
  }),
  seedAsset({
    code: "ADM-02-PA-000001",
    description: "Templo - PA",
    congregation: "PA",
    responsible: "LUIS ALBERTO DA SILVA CABRAL",
    location: "RUA 341, BLOCO 2, APTO 12 B - NOVA METRÓPOLE",
    documentation: "Sem documentacao informada",
    observations: "Bairro: ARATURI. CEP: 00.000-000. CPF: 162.481.713-00. RG: 2007366545-7.",
    sourceSheet: "PA",
  }),
  seedAsset({
    code: "ADM-02-TU-000001",
    description: "Templo - Tu",
    congregation: "Tu",
    responsible: "Manoel Aves do Nasimento",
    location: "RUA TUCUNDUBA, Nº 419 - FUNDOS - TUCUUNDUBA",
    documentation: "Sem documentacao informada",
    observations: "CEP: 00.000-000. CPF: 318.873.332.15. RG: 2001010522203.",
    sourceSheet: "Tu",
  }),
  seedAsset({
    code: "ADM-02-TU-000002",
    description: "Terreno - Tu",
    congregation: "Tu",
    responsible: "Manoel Aves do Nasimento",
    location: "RUA TUCUNDUBA, Nº 419 - FUNDOS - TUCUUNDUBA",
    documentation: "Contrato de Compra e Venda",
    observations: "Registro de terreno indicado no resumo patrimonial da aba Tu. CEP: 00.000-000.",
    sourceSheet: "Tu",
    subcategory: "Terreno",
  }),
  seedAsset({
    code: "ADM-02-IC-000001",
    description: "Templo - Ic",
    congregation: "Ic",
    responsible: "Jeff Zerbine da Silva",
    location: "Rua Walter Moura N° 650",
    documentation: "Contrato de Compra e Venda",
    observations: "Bairro: Icarai. CEP: 00.000-000. CPF: 35693150372. RG: 2003010008042.",
    sourceSheet: "Ic",
  }),
];

function seedAsset(input: {
  code: string;
  description: string;
  congregation: string;
  responsible: string;
  location: string;
  documentation: string;
  observations: string;
  sourceSheet: string;
  subcategory?: string;
}): PatrimonyAsset {
  return {
    id: `seed_${input.code}`,
    photo: "",
    code: input.code,
    description: input.description,
    shortDescription: input.description,
    category: "Imovel",
    subcategory: input.subcategory ?? "Templo",
    brand: "",
    model: "",
    serialNumber: "",
    internalCode: input.code,
    value: 0,
    currentValue: 0,
    supplier: "",
    invoice: "",
    acquisitionDate: "",
    warranty: "",
    congregation: input.congregation,
    sector: "Setor 02",
    area: "Patrimonio",
    location: input.location,
    responsible: input.responsible,
    status: "Ativo",
    documentation: input.documentation,
    lastInventoryAt: "",
    observations: input.observations,
    sourceSheet: input.sourceSheet,
    raw: {
      Codigo: input.code,
      Descricao: input.description,
      Congregacao: input.congregation,
      Dirigente: input.responsible,
      Endereco: input.location,
      Documentacao: input.documentation,
      Observacoes: input.observations,
      Fonte: `Cópia de S02 - P.xlsx / aba ${input.sourceSheet}`,
    },
  };
}
