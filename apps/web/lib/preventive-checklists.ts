export type PreventiveChecklistProfile = "VEICULO_CAMINHAO" | "MOTO" | "LANCHA";

export type PreventiveChecklistItem = {
  id: string;
  group: string;
  label: string;
};

const vehicleTruckItems: PreventiveChecklistItem[] = [
  { id: "pm-01", group: "Motor", label: "Nivel, viscosidade e validade do oleo do motor" },
  { id: "pm-02", group: "Motor", label: "Saturacao e integridade dos filtros (oleo, ar e combustivel)" },
  { id: "pm-03", group: "Motor", label: "Desgaste, ressecamento e tensao das correias e tensores" },
  { id: "pm-04", group: "Motor", label: "Estado das velas, cabos de ignicao e bobinas" },
  { id: "pm-05", group: "Arrefecimento", label: "Nivel e concentracao do aditivo no liquido" },
  { id: "pm-06", group: "Arrefecimento", label: "Estanqueidade de mangueiras, radiador e tampa" },
  { id: "pm-07", group: "Freios", label: "Espessura de pastilhas, discos, lonas e tambores" },
  { id: "pm-08", group: "Freios", label: "Nivel e contaminacao (ponto de ebulicao) do fluido" },
  { id: "pm-09", group: "Freios", label: "Regulagem do freio de mao e estado dos flexiveis" },
  { id: "pm-10", group: "Suspensao", label: "Vazamentos nos amortecedores e estado dos batentes" },
  { id: "pm-11", group: "Suspensao", label: "Folgas em pivos, terminais, bieletas e buchas" },
  { id: "pm-12", group: "Suspensao", label: "Alinhamento, cambagem e caster (geometria)" },
  { id: "pm-13", group: "Transmissao", label: "Nivel e validade do fluido de cambio (Manual/Automatico)" },
  { id: "pm-14", group: "Transmissao", label: "Integridade das coifas e juntas homocineticas" },
  { id: "pm-15", group: "Eletrica", label: "Tensao de carga da bateria e saude do alternador" },
  { id: "pm-16", group: "Eletrica", label: "Funcionamento de lampadas, setas, buzina e painel" },
  { id: "pm-17", group: "Pneus", label: "Profundidade dos sulcos (TWI), bolhas e cortes" },
  { id: "pm-18", group: "Pneus", label: "Calibragem, balanceamento e estado do estepe" },
  { id: "pm-19", group: "Visibilidade", label: "Estado das palhetas e funcionamento dos esguichos" },
  { id: "pm-20", group: "Ar-condicionado", label: "Higienizacao e estado do filtro de cabine" },
  { id: "eq-21", group: "Munk", label: "Inspecionar patolas e travamentos mecanicos" },
  { id: "eq-22", group: "Munk", label: "Conferir mangueiras, cilindros e conexoes hidraulicas" },
  { id: "eq-23", group: "Cesto Aereo", label: "Testar comandos e parada de emergencia" },
  { id: "eq-24", group: "Cesto Aereo", label: "Conferir nivelamento e intertravamentos" },
];

const motoItems: PreventiveChecklistItem[] = [
  { id: "moto-01", group: "Motor", label: "Nivel e validade do oleo do motor" },
  { id: "moto-02", group: "Motor", label: "Filtro de oleo e filtro de ar" },
  { id: "moto-03", group: "Combustivel", label: "Sistema de injecao e linhas sem vazamentos" },
  { id: "moto-04", group: "Transmissao", label: "Corrente, coroa e pinhao (desgaste e tensao)" },
  { id: "moto-05", group: "Freios", label: "Pastilhas, discos e fluido de freio" },
  { id: "moto-06", group: "Suspensao", label: "Retentores, amortecedores e folgas" },
  { id: "moto-07", group: "Direcao", label: "Rolamentos, alinhamento e estabilidade" },
  { id: "moto-08", group: "Eletrica", label: "Bateria, farois, setas, lanterna e painel" },
  { id: "moto-09", group: "Pneus", label: "Calibragem, sulcos e cortes" },
  { id: "moto-10", group: "Pneus", label: "Estado de rodas e balanceamento" },
  { id: "moto-11", group: "Seguranca", label: "Acionamento de buzina e comandos" },
  { id: "moto-12", group: "Seguranca", label: "Espelhos, manetes e pedais" },
  { id: "moto-13", group: "Operacao", label: "Teste dinamico curto sem anomalias" },
  { id: "moto-14", group: "Documentacao", label: "Registro da preventiva com km atual" },
];

const lanchaItems: PreventiveChecklistItem[] = [
  { id: "lancha-01", group: "Motor", label: "Nivel e validade do oleo do motor popa" },
  { id: "lancha-02", group: "Motor", label: "Filtro de combustivel e separador de agua" },
  { id: "lancha-03", group: "Arrefecimento", label: "Bomba d'agua, impeller e fluxo" },
  { id: "lancha-04", group: "Arrefecimento", label: "Mangueiras e conexoes sem vazamento" },
  { id: "lancha-05", group: "Eletrica", label: "Baterias, alternador e chave geral" },
  { id: "lancha-06", group: "Eletrica", label: "Luzes de navegacao, painel e alarmes" },
  { id: "lancha-07", group: "Casco", label: "Inspecao do casco e da pintura" },
  { id: "lancha-08", group: "Casco", label: "Conferir quilha, suportes e espelho de popa" },
  { id: "lancha-09", group: "Hidraulico", label: "Direcao hidraulica e comando do acelerador" },
  { id: "lancha-10", group: "Seguranca", label: "Bomba de porao e extintor" },
  { id: "lancha-11", group: "Seguranca", label: "Coletes, boia e kit de emergencia" },
  { id: "lancha-12", group: "Nautica", label: "Helice e eixo sem danos" },
  { id: "lancha-13", group: "Nautica", label: "Teste de marcha e resposta do motor" },
  { id: "lancha-14", group: "Documentacao", label: "Registro de horas e observacoes" },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function detectPreventiveChecklistProfile(assetLabel: string): PreventiveChecklistProfile {
  const value = normalize(assetLabel);
  if (value.includes("moto") || value.includes("mot-") || value.includes("cb ")) {
    return "MOTO";
  }

  if (
    value.includes("lancha") ||
    value.includes("nautica") ||
    value.includes("mar-") ||
    value.includes("sea ray")
  ) {
    return "LANCHA";
  }

  return "VEICULO_CAMINHAO";
}

export function getPreventiveChecklistTitle(assetLabel: string) {
  const profile = detectPreventiveChecklistProfile(assetLabel);
  if (profile === "MOTO") return "Checklist Preventiva - Moto";
  if (profile === "LANCHA") return "Checklist Preventiva - Lancha";
  return "Checklist Preventiva Completa";
}

export function createPreventiveChecklistItems(assetLabel: string) {
  const profile = detectPreventiveChecklistProfile(assetLabel);
  const source =
    profile === "MOTO" ? motoItems : profile === "LANCHA" ? lanchaItems : vehicleTruckItems;
  return source.map((item) => ({ ...item }));
}
