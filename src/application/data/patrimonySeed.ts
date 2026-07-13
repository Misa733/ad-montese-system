import type { PatrimonyAsset, PatrimonyInventory, PatrimonyMaintenance, PatrimonyMovement, PatrimonyProperty, PatrimonyStatus } from "./PatrimonyService";

type DemoCategory = "Mobiliario" | "Som e multimedia" | "Instrumentos" | "Climatizacao" | "Copa/cozinha" | "Eletrica/estrutura" | "Imovel" | "Informatica";

interface CongregationSeed {
  code: string;
  name: string;
  sector: string;
  responsible: string;
  address: string;
  neighborhood: string;
}

interface AssetTemplate {
  description: string;
  category: DemoCategory;
  subcategory: string;
  abbreviation: string;
  brand: string;
  model: string;
  quantity: number;
  unitValue: number;
  internalLocation: string;
  acquisitionMethod: string;
  documentation: string;
  conservationState: string;
  status?: PatrimonyStatus;
}

export const PATRIMONY_CONGREGATIONS: CongregationSeed[] = [
  { code: "MR", name: "Marechal Rondon", sector: "Setor 02", responsible: "Lindomar Lima da Conceicao", address: "Rua E27, Casa 106 - Parque Araturi", neighborhood: "Marechal Rondon" },
  { code: "M1", name: "Metropole 1", sector: "Setor 02", responsible: "Eliaquim Jose Cordeiro de Sousa", address: "Rua A, 76 A - Loteamento Metropole Sul", neighborhood: "Ciro Gomes" },
  { code: "M2", name: "Metropole 2", sector: "Setor 02", responsible: "Tarcisio Jeronimo do Nascimento", address: "Rua Sargento Feitosa, 588 - Nova Metropole", neighborhood: "Nova Metropole" },
  { code: "M3", name: "Metropole 3", sector: "Setor 02", responsible: "Geraldo Manoel de Araujo", address: "Rua Joao Bezerra, 1581 - Conjunto Metropolitano", neighborhood: "Patricia Gomes" },
  { code: "MH", name: "Monte Horebe", sector: "Setor 02", responsible: "Carlos Andre Azevedo Monteiro", address: "Rua Idealista, 81 - Residencial Tebas", neighborhood: "Cajueiros" },
  { code: "PA", name: "Parque Araturi", sector: "Setor 02", responsible: "Luis Alberto da Silva Cabral", address: "Rua 341, Bloco 2, Apto 12 B - Nova Metropole", neighborhood: "Araturi" },
  { code: "PC", name: "Planalto Caucaia", sector: "Setor 02", responsible: "Marcio Atila Rocha Miranda", address: "Rua 121, 66 - Planalto Caucaia", neighborhood: "Planalto Caucaia" },
  { code: "TU", name: "Tucunduba", sector: "Setor 02", responsible: "Manoel Alves do Nascimento", address: "Rua Tucunduba, 419 - Fundos", neighborhood: "Tucunduba" },
  { code: "MI", name: "Missionaria", sector: "Setor 02", responsible: "Manoel Alves do Nascimento", address: "Endereco em atualizacao", neighborhood: "Setor 2" },
  { code: "IC", name: "Icarai", sector: "Setor 02", responsible: "Jeff Zerbine da Silva", address: "Rua Walter Moura, 650", neighborhood: "Icarai" },
  { code: "C15", name: "Comunidade 15", sector: "Setor 02", responsible: "Secretaria do Setor 2", address: "Endereco em cadastramento", neighborhood: "Setor 2" },
  { code: "AR", name: "Arianopolis", sector: "Setor 02", responsible: "Jose Edivan Sousa Rocha", address: "Rua W19, Casa 29 - Araturi", neighborhood: "Arianopolis" },
  { code: "S13", name: "Sede do Setor 13", sector: "Setor 13", responsible: "Coordenacao Setor 13", address: "Av. Central, 1300 - Sede Setor 13", neighborhood: "Centro Ministerial" },
  { code: "SMG", name: "Sao Miguel", sector: "Setor 13", responsible: "Dirigente Sao Miguel", address: "Rua Sao Miguel, 210 - Comunidade Sao Miguel", neighborhood: "Sao Miguel" },
  { code: "S4", name: "Sede do Setor 4", sector: "Setor 04", responsible: "Coordenacao Setor 4", address: "Rua Principal, 400 - Sede Setor 4", neighborhood: "Sede Setor 4" },
  { code: "AVD", name: "Area Verde", sector: "Setor 04", responsible: "Dirigente Area Verde", address: "Rua das Palmeiras, 87 - Area Verde", neighborhood: "Area Verde" },
  { code: "SCE", name: "Santa Cecilia", sector: "Setor 04", responsible: "Dirigente Santa Cecilia", address: "Rua Santa Cecilia, 55", neighborhood: "Santa Cecilia" },
  { code: "EST", name: "Sede Estadual", sector: "Sede Estadual", responsible: "Administracao Estadual", address: "Av. Estadual, 957 - Montese", neighborhood: "Montese" },
];

const templates: AssetTemplate[] = [
  { description: "Cadeiras plasticas brancas", category: "Mobiliario", subcategory: "Cadeiras plasticas", abbreviation: "MOB", brand: "Tramontina", model: "Bistro branca", quantity: 80, unitValue: 42, internalLocation: "Nave principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Cadeiras acolchoadas vermelhas", category: "Mobiliario", subcategory: "Cadeiras acolchoadas", abbreviation: "MOB", brand: "Moveis Fortaleza", model: "Igreja premium", quantity: 120, unitValue: 95, internalLocation: "Nave principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Otimo" },
  { description: "Bancos de madeira envernizados", category: "Mobiliario", subcategory: "Bancos", abbreviation: "MOB", brand: "Marcenaria local", model: "Cedro 3m", quantity: 12, unitValue: 580, internalLocation: "Nave principal", acquisitionMethod: "Doacao", documentation: "Declaracao", conservationState: "Bom" },
  { description: "Mesa de apoio ministerial", category: "Mobiliario", subcategory: "Mesas", abbreviation: "MOB", brand: "Marcenaria local", model: "Apoio culto", quantity: 2, unitValue: 340, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Armario de secretaria", category: "Mobiliario", subcategory: "Armarios", abbreviation: "MOB", brand: "Pandim", model: "Aco 2 portas", quantity: 2, unitValue: 760, internalLocation: "Secretaria", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Regular" },
  { description: "Pulpito de madeira", category: "Mobiliario", subcategory: "Pulpito", abbreviation: "MOB", brand: "Marcenaria local", model: "AD Montese", quantity: 1, unitValue: 1800, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Contrato simples", conservationState: "Otimo" },
  { description: "Estante para instrumentos", category: "Mobiliario", subcategory: "Estantes", abbreviation: "MOB", brand: "Multivisao", model: "Prateleira reforcada", quantity: 1, unitValue: 420, internalLocation: "Sala de musica", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Bebedouro Esmaltec", category: "Copa/cozinha", subcategory: "Bebedouro", abbreviation: "COP", brand: "Esmaltec", model: "Gelagua coluna", quantity: 1, unitValue: 720, internalLocation: "Entrada lateral", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Mesa de som Behringer Xenyx", category: "Som e multimedia", subcategory: "Mesa de som", abbreviation: "SOM", brand: "Behringer", model: "Xenyx X2222USB", quantity: 1, unitValue: 2850, internalLocation: "Cabine de som", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Caixas de som JBL", category: "Som e multimedia", subcategory: "Caixas de som", abbreviation: "SOM", brand: "JBL", model: "IRX112BT", quantity: 2, unitValue: 3100, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Otimo" },
  { description: "Microfones com fio Shure", category: "Som e multimedia", subcategory: "Microfones com fio", abbreviation: "SOM", brand: "Shure", model: "SM58", quantity: 4, unitValue: 690, internalLocation: "Cabine de som", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Microfones sem fio", category: "Som e multimedia", subcategory: "Microfones sem fio", abbreviation: "SOM", brand: "Kadosh", model: "K502M", quantity: 2, unitValue: 940, internalLocation: "Cabine de som", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Regular" },
  { description: "Pedestais para microfone", category: "Som e multimedia", subcategory: "Pedestais", abbreviation: "SOM", brand: "Ask", model: "Tripé telescopico", quantity: 4, unitValue: 135, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Retorno de palco ativo", category: "Som e multimedia", subcategory: "Retorno", abbreviation: "SOM", brand: "Staner", model: "SR315A", quantity: 1, unitValue: 1640, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Projetor Epson", category: "Som e multimedia", subcategory: "Projetor", abbreviation: "SOM", brand: "Epson", model: "PowerLite E20", quantity: 1, unitValue: 3600, internalLocation: "Cabine de midia", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Regular" },
  { description: "Tela de projecao retratil", category: "Som e multimedia", subcategory: "Tela de projecao", abbreviation: "SOM", brand: "TES", model: "100 polegadas", quantity: 1, unitValue: 620, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Notebook Dell", category: "Informatica", subcategory: "Notebook", abbreviation: "INF", brand: "Dell", model: "Inspiron 15", quantity: 1, unitValue: 3850, internalLocation: "Secretaria", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Otimo" },
  { description: "Computador administrativo", category: "Informatica", subcategory: "Computador", abbreviation: "INF", brand: "Positivo", model: "Master D3200", quantity: 1, unitValue: 2450, internalLocation: "Secretaria", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Camera Logitech para transmissao", category: "Som e multimedia", subcategory: "Camera", abbreviation: "SOM", brand: "Logitech", model: "C920", quantity: 1, unitValue: 520, internalLocation: "Cabine de midia", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Sistema de transmissao HDMI", category: "Som e multimedia", subcategory: "Transmissao", abbreviation: "SOM", brand: "Intelbras", model: "Kit streaming", quantity: 1, unitValue: 1680, internalLocation: "Cabine de midia", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Teclado Yamaha", category: "Instrumentos", subcategory: "Teclado", abbreviation: "INS", brand: "Yamaha", model: "PSR-E473", quantity: 1, unitValue: 3100, internalLocation: "Altar", acquisitionMethod: "Doacao", documentation: "Declaracao de doacao", conservationState: "Bom" },
  { description: "Violao Tagima", category: "Instrumentos", subcategory: "Violao", abbreviation: "INS", brand: "Tagima", model: "Dallas", quantity: 1, unitValue: 890, internalLocation: "Sala de musica", acquisitionMethod: "Doacao", documentation: "Declaracao de doacao", conservationState: "Regular" },
  { description: "Guitarra Strinberg", category: "Instrumentos", subcategory: "Guitarra", abbreviation: "INS", brand: "Strinberg", model: "STS100", quantity: 1, unitValue: 1260, internalLocation: "Sala de musica", acquisitionMethod: "Doacao", documentation: "Sem documentacao", conservationState: "Bom" },
  { description: "Baixo Tagima", category: "Instrumentos", subcategory: "Baixo", abbreviation: "INS", brand: "Tagima", model: "TBM4", quantity: 1, unitValue: 1450, internalLocation: "Sala de musica", acquisitionMethod: "Doacao", documentation: "Declaracao", conservationState: "Bom" },
  { description: "Bateria acústica", category: "Instrumentos", subcategory: "Bateria", abbreviation: "INS", brand: "Michael", model: "DM851", quantity: 1, unitValue: 4200, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Regular" },
  { description: "Cajon", category: "Instrumentos", subcategory: "Cajon", abbreviation: "INS", brand: "FSA", model: "Inclinado", quantity: 1, unitValue: 480, internalLocation: "Sala de musica", acquisitionMethod: "Doacao", documentation: "Sem documentacao", conservationState: "Bom" },
  { description: "Amplificador de guitarra", category: "Instrumentos", subcategory: "Amplificador", abbreviation: "INS", brand: "Meteoro", model: "Nitrous Drive", quantity: 1, unitValue: 890, internalLocation: "Altar", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Ar-condicionado Midea 12000 BTUs", category: "Climatizacao", subcategory: "Ar-condicionado", abbreviation: "CLI", brand: "Midea", model: "Springer 12000", quantity: 1, unitValue: 2450, internalLocation: "Nave principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Ventiladores de parede", category: "Climatizacao", subcategory: "Ventilador", abbreviation: "CLI", brand: "Ventisol", model: "60cm parede", quantity: 6, unitValue: 260, internalLocation: "Nave principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Cortina de ar", category: "Climatizacao", subcategory: "Cortina de ar", abbreviation: "CLI", brand: "Springer", model: "120cm", quantity: 1, unitValue: 980, internalLocation: "Entrada principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Regular" },
  { description: "Geladeira Consul", category: "Copa/cozinha", subcategory: "Geladeira", abbreviation: "COP", brand: "Consul", model: "CRB39", quantity: 1, unitValue: 2300, internalLocation: "Copa", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Freezer horizontal", category: "Copa/cozinha", subcategory: "Freezer", abbreviation: "COP", brand: "Electrolux", model: "H330", quantity: 1, unitValue: 3100, internalLocation: "Copa", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Fogao quatro bocas", category: "Copa/cozinha", subcategory: "Fogao", abbreviation: "COP", brand: "Atlas", model: "Monaco", quantity: 1, unitValue: 760, internalLocation: "Cozinha", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Botijao de gas", category: "Copa/cozinha", subcategory: "Botijao", abbreviation: "COP", brand: "Liquigas", model: "P13", quantity: 2, unitValue: 150, internalLocation: "Cozinha", acquisitionMethod: "Compra", documentation: "Recibo", conservationState: "Bom" },
  { description: "Liquidificador industrial", category: "Copa/cozinha", subcategory: "Liquidificador", abbreviation: "COP", brand: "Skymsen", model: "4L", quantity: 1, unitValue: 690, internalLocation: "Cozinha", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Otimo" },
  { description: "Utensilios de copa", category: "Copa/cozinha", subcategory: "Utensilios", abbreviation: "COP", brand: "Diversos", model: "Kit eventos", quantity: 1, unitValue: 840, internalLocation: "Copa", acquisitionMethod: "Compra", documentation: "Recibo", conservationState: "Bom" },
  { description: "Quadro eletrico geral", category: "Eletrica/estrutura", subcategory: "Quadro eletrico", abbreviation: "ELE", brand: "Steck", model: "Distribuicao 24", quantity: 1, unitValue: 1250, internalLocation: "Sala tecnica", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Refletores LED", category: "Eletrica/estrutura", subcategory: "Refletores", abbreviation: "ELE", brand: "Avant", model: "100W", quantity: 6, unitValue: 180, internalLocation: "Fachada", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Luminarias internas", category: "Eletrica/estrutura", subcategory: "Luminarias", abbreviation: "ELE", brand: "Ourolux", model: "LED tubular", quantity: 18, unitValue: 58, internalLocation: "Nave principal", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
  { description: "Extintor ABC", category: "Eletrica/estrutura", subcategory: "Extintores", abbreviation: "ELE", brand: "Extang", model: "ABC 4kg", quantity: 2, unitValue: 260, internalLocation: "Entrada principal", acquisitionMethod: "Compra", documentation: "Certificado", conservationState: "Regular" },
  { description: "Portao de ferro", category: "Eletrica/estrutura", subcategory: "Portao", abbreviation: "ELE", brand: "Serralheria local", model: "Deslizante", quantity: 1, unitValue: 2800, internalLocation: "Entrada externa", acquisitionMethod: "Compra", documentation: "Contrato simples", conservationState: "Bom" },
  { description: "Grades de protecao", category: "Eletrica/estrutura", subcategory: "Grades", abbreviation: "ELE", brand: "Serralheria local", model: "Janela", quantity: 4, unitValue: 430, internalLocation: "Janelas laterais", acquisitionMethod: "Compra", documentation: "Contrato simples", conservationState: "Bom" },
  { description: "Caixa d'agua", category: "Eletrica/estrutura", subcategory: "Caixa d'agua", abbreviation: "ELE", brand: "Fortlev", model: "1000L", quantity: 1, unitValue: 520, internalLocation: "Cobertura", acquisitionMethod: "Compra", documentation: "Nota fiscal", conservationState: "Bom" },
];

const realEstateTemplates: AssetTemplate[] = [
  { description: "Templo proprio", category: "Imovel", subcategory: "Templo proprio", abbreviation: "IMO", brand: "AD Montese", model: "Imovel ministerial", quantity: 1, unitValue: 180000, internalLocation: "Imovel principal", acquisitionMethod: "Compra", documentation: "Contrato de compra e venda", conservationState: "Bom" },
  { description: "Templo alugado", category: "Imovel", subcategory: "Templo alugado", abbreviation: "IMO", brand: "AD Montese", model: "Imovel locado", quantity: 1, unitValue: 0, internalLocation: "Imovel principal", acquisitionMethod: "Aluguel", documentation: "Contrato de aluguel", conservationState: "Bom" },
  { description: "Terreno", category: "Imovel", subcategory: "Terreno", abbreviation: "IMO", brand: "AD Montese", model: "Terreno urbano", quantity: 1, unitValue: 95000, internalLocation: "Area externa", acquisitionMethod: "Compra", documentation: "Contrato de compra e venda", conservationState: "Bom" },
  { description: "Casa pastoral", category: "Imovel", subcategory: "Casa pastoral", abbreviation: "IMO", brand: "AD Montese", model: "Residencia pastoral", quantity: 1, unitValue: 135000, internalLocation: "Anexo", acquisitionMethod: "Cessao", documentation: "Termo de cessao", conservationState: "Regular" },
  { description: "Sala anexa", category: "Imovel", subcategory: "Sala anexa", abbreviation: "IMO", brand: "AD Montese", model: "Apoio ministerial", quantity: 1, unitValue: 38000, internalLocation: "Anexo", acquisitionMethod: "Construcao", documentation: "Declaracao", conservationState: "Bom" },
];

export const PATRIMONY_SEED_ASSETS: PatrimonyAsset[] = buildAssets();
export const PATRIMONY_SEED_MOVEMENTS: PatrimonyMovement[] = buildMovements();
export const PATRIMONY_SEED_MAINTENANCES: PatrimonyMaintenance[] = buildMaintenances();
export const PATRIMONY_SEED_INVENTORIES: PatrimonyInventory[] = buildInventories();
export const PATRIMONY_SEED_PROPERTIES: PatrimonyProperty[] = buildProperties();

function buildAssets() {
  const assets: PatrimonyAsset[] = [];
  PATRIMONY_CONGREGATIONS.forEach((congregation, congregationIndex) => {
    templates.forEach((template, templateIndex) => {
      assets.push(seedAsset(congregation, template, templateIndex + 1, congregationIndex));
    });
  });

  realEstateTemplates.forEach((template, index) => {
    const congregation = PATRIMONY_CONGREGATIONS[index % PATRIMONY_CONGREGATIONS.length];
    assets.push(seedAsset(congregation, template, index + 1, index, true));
  });

  return assets;
}

function seedAsset(congregation: CongregationSeed, template: AssetTemplate, sequence: number, offset: number, forceImovel = false): PatrimonyAsset {
  const code = `ADM-${seedSectorCode(congregation.sector)}-${congregation.code}-${template.abbreviation}-${String(sequence).padStart(4, "0")}`;
  const acquisitionYear = 2020 + ((sequence + offset) % 7);
  const month = String(((sequence + offset) % 12) + 1).padStart(2, "0");
  const day = String(((sequence * 3 + offset) % 26) + 1).padStart(2, "0");
  const total = template.quantity * template.unitValue;
  const status = template.status ?? (sequence % 31 === 0 ? "Baixado" : sequence % 17 === 0 ? "Em manutencao" : "Ativo");
  const conservationState = sequence % 19 === 0 ? "Ruim" : template.conservationState;
  const sourceSheet = ["MR", "M1", "M2", "M3", "MH", "PA", "PC", "TU", "MI", "IC", "C15", "Ar"].includes(congregation.code) ? congregation.code : "Seed demo";
  return {
    id: `seed_${code}`,
    photo: "",
    code,
    description: `${template.description} - ${congregation.code}`,
    shortDescription: template.description,
    category: template.category,
    subcategory: template.subcategory,
    brand: template.brand,
    model: template.model,
    serialNumber: `${template.abbreviation}${congregation.code}${String(sequence + offset).padStart(5, "0")}`,
    quantity: template.quantity,
    unitValue: template.unitValue,
    totalValue: total,
    internalCode: code,
    value: total,
    currentValue: Math.round(total * (forceImovel ? 1 : 0.88)),
    acquisitionMethod: template.acquisitionMethod,
    supplier: forceImovel ? "Documentacao patrimonial Setor 2" : "Fornecedor local homologado",
    invoice: template.documentation === "Nota fiscal" ? `NF-${congregation.code}-${String(sequence).padStart(5, "0")}` : "",
    acquisitionDate: `${acquisitionYear}-${month}-${day}`,
    warranty: forceImovel ? "Nao aplicavel" : sequence % 4 === 0 ? "12 meses" : "Sem garantia ativa",
    congregation: congregation.name,
    congregationCode: congregation.code,
    sector: congregation.sector,
    area: template.category === "Imovel" ? "Administracao patrimonial" : "Culto e apoio",
    location: congregation.address,
    internalLocation: template.internalLocation,
    responsible: congregation.responsible,
    status,
    conservationState,
    documentation: template.documentation,
    documents: template.documentation === "Sem documentacao" ? [] : [template.documentation],
    photos: [],
    lastInventoryAt: sequence % 5 === 0 ? "" : `2026-0${((sequence + offset) % 6) + 1}-15`,
    nextInventoryAt: `2026-${String(((sequence + offset + 6) % 12) + 1).padStart(2, "0")}-15`,
    observations: `Seed/demo para prototipo. Origem prioritária: planilha do Setor 2 quando existente; complemento demonstrativo para ${congregation.name}.`,
    sourceSheet,
    qrCode: code,
    isDemo: true,
    raw: {
      Fonte: "Seed/demo patrimonial do prototipo",
      Codigo: code,
      Descricao: template.description,
      Congregacao: congregation.name,
      Sigla: congregation.code,
      Quantidade: template.quantity,
      ValorTotal: total,
    },
  };
}

function seedSectorCode(sector: string) {
  const number = sector.match(/\d+/)?.[0];
  if (number) return `S${number.padStart(2, "0")}`;
  return sector.toLowerCase().includes("estadual") ? "EST" : "S00";
}

function buildMovements(): PatrimonyMovement[] {
  const assets = PATRIMONY_SEED_ASSETS.slice(0, 24);
  const types = ["Cadastro", "Tombamento", "Transferencia", "Conferencia", "Manutencao", "Atualizacao", "Inventario", "Baixa"];
  return assets.map((asset, index) => ({
    id: `mov_demo_${index + 1}`,
    assetCode: asset.code,
    assetDescription: asset.description,
    type: types[index % types.length],
    date: `2026-${String((index % 6) + 1).padStart(2, "0")}-${String((index % 24) + 1).padStart(2, "0")}`,
    user: index % 2 === 0 ? "Secretaria Setor 2" : "Tesouraria Setor 2",
    origin: index % 3 === 0 ? "Sede do setor" : asset.internalLocation,
    destination: asset.location,
    observation: `Movimentacao demonstrativa registrada para ${asset.shortDescription}.`,
  }));
}

function buildMaintenances(): PatrimonyMaintenance[] {
  const candidates: Array<[string, string, string, number]> = [
    ["CLI", "Ar-condicionado com baixa refrigeracao", "Clima Service", 420],
    ["SOM", "Mesa de som com canal defeituoso", "Audio Pro Fortaleza", 680],
    ["SOM", "Microfone sem fio com bateria danificada", "Audio Pro Fortaleza", 160],
    ["SOM", "Projetor com lampada fraca", "Tec Projetores CE", 520],
    ["MOB", "Cadeira quebrada no encosto", "Marcenaria local", 95],
    ["ELE", "Extintor vencido para recarga", "Extintores Caucaia", 140],
    ["INS", "Teclado com tecla falhando", "Musical Center", 350],
    ["COP", "Geladeira com borracha ressecada", "Refrigera Caucaia", 230],
    ["INF", "Notebook lento e com bateria viciada", "InfoTech CE", 480],
    ["ELE", "Refletor externo queimado", "Eletrica Araturi", 190],
  ];
  return candidates.map(([abbr, problem, supplier, value], index) => {
    const asset = PATRIMONY_SEED_ASSETS.find((item) => item.code.includes(`-${abbr}-`)) ?? PATRIMONY_SEED_ASSETS[index];
    return {
      id: `mnt_demo_${index + 1}`,
      assetCode: asset.code,
      problem,
      date: `2026-0${(index % 6) + 1}-0${(index % 8) + 1}`,
      responsible: asset.responsible,
      supplier,
      value: Number(value),
      finalValue: index % 4 === 0 ? Number(value) + 35 : undefined,
      warranty: index % 2 === 0 ? "90 dias" : "Sem garantia",
      deadline: `2026-0${(index % 6) + 1}-2${index % 8}`,
      completedAt: index % 4 === 0 ? `2026-0${(index % 6) + 1}-2${index % 8}` : undefined,
      status: ["Aberta", "Em andamento", "Aguardando orçamento", "Concluida", "Cancelada"][index % 5],
      observations: "Ordem demonstrativa para validacao do fluxo de manutencao.",
    };
  });
}

function buildInventories(): PatrimonyInventory[] {
  const inventoryData = [
    ["Inventario Geral 2026 - Setor 2", "Todos", "Setor 02", "Todos", "Secretaria Setor 2", "Em andamento", 158, 112, 42, 4],
    ["Inventario Sede do Setor", "Administracao patrimonial", "Setor 02", "Sede", "Tesouraria Setor 2", "Planejado", 34, 0, 34, 0],
    ["Inventario Congregacao MR", "Culto e apoio", "Setor 02", "Marechal Rondon", "Lindomar Lima da Conceicao", "Concluido", 46, 46, 0, 0],
    ["Inventario Congregacao PA", "Culto e apoio", "Setor 02", "Parque Araturi", "Luis Alberto da Silva Cabral", "Com divergencias", 52, 45, 5, 2],
    ["Inventario Equipamentos de Som", "Culto e apoio", "Setor 02", "Todos", "Equipe de midia", "Pendente", 28, 16, 11, 1],
    ["Inventario Setor 13 - Sede e Sao Miguel", "Culto e apoio", "Setor 13", "Todos", "Coordenacao Setor 13", "Em andamento", 74, 41, 31, 2],
    ["Inventario Setor 4 - Area Verde e Santa Cecilia", "Culto e apoio", "Setor 04", "Todos", "Coordenacao Setor 4", "Planejado", 96, 0, 96, 0],
    ["Inventario Sede Estadual", "Administracao patrimonial", "Sede Estadual", "Sede Estadual", "Administracao Estadual", "Em andamento", 58, 32, 24, 2],
  ] as const;

  return inventoryData.map(([name, area, sector, congregation, responsible, status, total, checked, pending, notFound], index) => ({
    id: `inv_demo_${index + 1}`,
    name,
    area,
    sector,
    congregation,
    responsible,
    createdAt: `2026-0${index + 1}-01T09:00:00.000Z`,
    startedAt: `2026-0${index + 1}-02`,
    finishedAt: status === "Concluido" ? `2026-0${index + 1}-20` : undefined,
    status,
    totalItems: total,
    checkedItems: checked,
    pendingItems: pending,
    notFoundItems: notFound,
    completionPercentage: Math.round((checked / total) * 100),
    checks: {},
  }));
}

function buildProperties(): PatrimonyProperty[] {
  const templates: Array<[string, string, string, string, string, string, number, string, string, string]> = [
    ["Templo proprio MR", "Proprio", "Marechal Rondon", "Rua E27, Casa 106 - Parque Araturi", "Marechal Rondon", "Contrato de compra e venda", 180000, "240 m2", "320 m2", "Lindomar Lima da Conceicao"],
    ["Templo proprio PA", "Proprio", "Parque Araturi", "Rua 341 - Nova Metropole", "Araturi", "Declaracao", 190000, "260 m2", "350 m2", "Luis Alberto da Silva Cabral"],
    ["Terreno TU", "Em regularizacao", "Tucunduba", "Rua Tucunduba, 419", "Tucunduba", "Contrato de compra e venda", 95000, "0 m2", "420 m2", "Manoel Alves do Nascimento"],
    ["Templo alugado IC", "Alugado", "Icarai", "Rua Walter Moura, 650", "Icarai", "Contrato de aluguel", 0, "180 m2", "220 m2", "Jeff Zerbine da Silva"],
    ["Casa pastoral M3", "Cedido", "Metropole 3", "Rua Joao Bezerra, 1581", "Patricia Gomes", "Termo de cessao", 135000, "90 m2", "160 m2", "Geraldo Manoel de Araujo"],
    ["Sala de apoio M1", "Proprio", "Metropole 1", "Rua A, 76 A", "Ciro Gomes", "Declaracao", 38000, "45 m2", "60 m2", "Eliaquim Jose Cordeiro de Sousa"],
    ["Templo alugado PC", "Alugado", "Planalto Caucaia", "Rua 121, 66", "Planalto Caucaia", "Contrato de aluguel", 0, "200 m2", "260 m2", "Marcio Atila Rocha Miranda"],
    ["Terreno Sede Setor 2", "Proprio", "Sede", "Conjunto Araturi", "Conjunto Araturi", "Sem documentacao", 120000, "0 m2", "500 m2", "Tesouraria Setor 2"],
    ["Sede do Setor 13", "Proprio", "Sede do Setor 13", "Av. Central, 1300", "Centro Ministerial", "Escritura", 260000, "310 m2", "520 m2", "Coordenacao Setor 13"],
    ["Templo Sao Miguel", "Proprio", "Sao Miguel", "Rua Sao Miguel, 210", "Sao Miguel", "Contrato de compra e venda", 145000, "210 m2", "330 m2", "Dirigente Sao Miguel"],
    ["Sede do Setor 4", "Proprio", "Sede do Setor 4", "Rua Principal, 400", "Sede Setor 4", "Escritura", 235000, "280 m2", "470 m2", "Coordenacao Setor 4"],
    ["Templo Area Verde", "Cedido", "Area Verde", "Rua das Palmeiras, 87", "Area Verde", "Termo de cessao", 98000, "170 m2", "260 m2", "Dirigente Area Verde"],
    ["Templo Santa Cecilia", "Alugado", "Santa Cecilia", "Rua Santa Cecilia, 55", "Santa Cecilia", "Contrato de aluguel", 0, "190 m2", "250 m2", "Dirigente Santa Cecilia"],
    ["Sede Estadual", "Proprio", "Sede Estadual", "Av. Estadual, 957 - Montese", "Montese", "Escritura", 620000, "860 m2", "1300 m2", "Administracao Estadual"],
  ];

  return templates.map(([name, type, congregation, address, neighborhood, documentType, value, builtArea, landArea, responsible], index) => ({
    id: `property_demo_${index + 1}`,
    name,
    congregation,
    area: "Administracao patrimonial",
    sector: sectorForProperty(congregation),
    address,
    neighborhood,
    cep: "00.000-000",
    city: "Caucaia",
    state: "CE",
    type,
    documentation: documentType,
    documentationStatus: documentType === "Sem documentacao" ? "Pendente" : "Regular",
    documentType,
    value: Number(value),
    builtArea,
    landArea,
    responsible,
    observations: "Imovel demonstrativo para fluxo patrimonial do prototipo.",
    sourceSheet: "Seed/demo patrimonial",
  }));
}

function sectorForProperty(congregation: string) {
  return PATRIMONY_CONGREGATIONS.find((item) => item.name === congregation)?.sector ?? "Setor 02";
}
