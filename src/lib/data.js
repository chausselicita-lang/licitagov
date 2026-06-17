export const STORAGE_KEY = "licitagov_data_v2";

export function loadData() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return null;
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export const SEED = {
  processos: [
    { id:"p1", numero:"001/2025", objeto:"Aquisição de combustíveis", modalidade:"Pregão Eletrônico", fase:"Homologado", valor:180000, abertura:"2025-03-10", orgao:"Secretaria de Obras" },
    { id:"p2", numero:"002/2025", objeto:"Serviços de limpeza urbana", modalidade:"Pregão Eletrônico", fase:"Em andamento", valor:320000, abertura:"2025-04-22", orgao:"Secretaria de Serviços" },
    { id:"p3", numero:"003/2025", objeto:"Material de escritório", modalidade:"Pregão Eletrônico", fase:"Planejamento", valor:12000, abertura:"2025-05-15", orgao:"Administrativo" },
    { id:"p4", numero:"004/2025", objeto:"Equipamentos de TI", modalidade:"Pregão Eletrônico", fase:"Publicado", valor:95000, abertura:"2025-06-01", orgao:"Secretaria de TI" },
  ],
  atas: [
    { id:"a1", numero:"ARP 001/2025", objeto:"Combustíveis automotivos", fornecedor:"Posto Ipiranga Ltda", cnpj:"12.345.678/0001-99", vigencia:"2026-03-10", valorTotal:180000, saldoDisponivel:145000, itens:[
      { id:"i1", descricao:"Gasolina Comum", unidade:"Litro", qtdRegistrada:5000, qtdUtilizada:1400, valorUnit:5.80 },
      { id:"i2", descricao:"Diesel S-10", unidade:"Litro", qtdRegistrada:8000, qtdUtilizada:2200, valorUnit:6.40 },
    ]},
    { id:"a2", numero:"ARP 002/2025", objeto:"Material de limpeza", fornecedor:"Distribuidora Clean Ltda", cnpj:"98.765.432/0001-11", vigencia:"2025-12-31", valorTotal:48000, saldoDisponivel:31200, itens:[
      { id:"i3", descricao:"Detergente 500ml", unidade:"Unidade", qtdRegistrada:2000, qtdUtilizada:600, valorUnit:2.50 },
      { id:"i4", descricao:"Água sanitária 1L", unidade:"Unidade", qtdRegistrada:1500, qtdUtilizada:400, valorUnit:3.20 },
    ]},
  ],
  contratos: [
    { id:"c1", numero:"CT 001/2025", objeto:"Serviços de limpeza urbana", fornecedor:"LimpaMais Ltda", cnpj:"11.222.333/0001-44", valor:320000, inicio:"2025-05-01", fim:"2026-04-30", status:"Vigente", processo:"002/2025" },
    { id:"c2", numero:"CT 002/2025", objeto:"Manutenção de veículos", fornecedor:"Auto Center Norte", cnpj:"55.666.777/0001-88", valor:85000, inicio:"2025-01-15", fim:"2026-01-15", status:"A vencer", processo:"—" },
    { id:"c3", numero:"CT 003/2024", objeto:"Fornecimento de merenda", fornecedor:"Alimentos Bom Sabor", cnpj:"33.444.555/0001-22", valor:210000, inicio:"2024-02-01", fim:"2025-02-01", status:"Encerrado", processo:"—" },
  ],
  cotacoes: [
    { id:"q1", numero:"COT 001/2025", objeto:"Aquisição de papel A4", processo:"003/2025", status:"Finalizada", dataCriacao:"2025-02-10",
      fornecedores:[
        { id:"f1", razao:"Papelaria ABC", cnpj:"10.000.001/0001-01" },
        { id:"f2", razao:"Distribuidora XYZ", cnpj:"10.000.002/0001-02" },
        { id:"f3", razao:"Atacado Paper", cnpj:"10.000.003/0001-03" },
      ],
      itens:[
        { id:"it1", descricao:"Papel A4 75g/m² — Resma 500fls", unidade:"Resma", qtd:200, valores:{ f1:22.50, f2:21.00, f3:23.80 } },
        { id:"it2", descricao:"Papel A4 90g/m² — Resma 500fls", unidade:"Resma", qtd:50, valores:{ f1:28.00, f2:26.50, f3:29.00 } },
      ]
    },
  ],
};
