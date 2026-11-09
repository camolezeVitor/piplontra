export interface PerkDef {
    id: string;
    label: string;
    description: string;
    icon: string;
    /** Quantas vezes o perk pode ser escolhido — cada rank soma 1 ponto de perk gasto. */
    maxRank: number;
}

/** Catálogo de perks do universo Fallout (majoritariamente Fallout 4) usado na progressão de nível. */
export const PERKS: PerkDef[] = [
    { id: 'toughness', label: 'TOUGHNESS', description: 'Aumenta sua Resistência a Dano (RD).', icon: 'fa-solid fa-shield-halved', maxRank: 3 },
    { id: 'strong-back', label: 'STRONG BACK', description: 'Aumenta sua capacidade de carga.\nNíveis maiores permitem correr sobrecarregado.', icon: 'fa-solid fa-dumbbell', maxRank: 5 },
    { id: 'gun-nut', label: 'GUN NUT', description: 'Permite criar modificações avançadas de armas.\nArmas mais poderosas exigem maior habilidade.', icon: 'fa-solid fa-gun', maxRank: 4 },
    { id: 'armorer', label: 'ARMORER', description: 'Permite criar e melhorar modificações de armadura.', icon: 'fa-solid fa-shield', maxRank: 4 },
    { id: 'blacksmith', label: 'BLACKSMITH', description: 'Melhora armas corpo-a-corpo e de impacto na bancada.', icon: 'fa-solid fa-hammer', maxRank: 3 },
    { id: 'science', label: 'SCIENCE!', description: 'Permite criar mods avançados de armas de energia e eletrônicos.', icon: 'fa-solid fa-flask', maxRank: 4 },
    { id: 'locksmith', label: 'LOCKSMITH', description: 'Você pode abrir fechaduras avançadas e, com níveis maiores, fechaduras mestre.', icon: 'fa-solid fa-key', maxRank: 4 },
    { id: 'hacker', label: 'HACKER', description: 'Permite hackear terminais avançados.\nCom níveis maiores: expert e master.', icon: 'fa-solid fa-laptop-code', maxRank: 4 },
    { id: 'gunslinger', label: 'GUNSLINGER', description: 'Aumenta dano e chance de acerto crítico com pistolas.', icon: 'fa-solid fa-gun', maxRank: 5 },
    { id: 'rifleman', label: 'RIFLEMAN', description: 'Aumenta dano e chance de acerto crítico com rifles não-automáticos.', icon: 'fa-solid fa-crosshairs', maxRank: 5 },
    { id: 'commando', label: 'COMMANDO', description: 'Aumenta dano e precisão de armas automáticas.', icon: 'fa-solid fa-person-rifle', maxRank: 5 },
    { id: 'heavy-gunner', label: 'HEAVY GUNNER', description: 'Aumenta dano com armas pesadas.', icon: 'fa-solid fa-truck-monster', maxRank: 5 },
    { id: 'demolition-expert', label: 'DEMOLITION EXPERT', description: 'Aumenta dano de explosivos e minas.', icon: 'fa-solid fa-bomb', maxRank: 5 },
    { id: 'blitz', label: 'BLITZ', description: 'Aumenta o alcance de ataques corpo-a-corpo no V.A.T.S.', icon: 'fa-solid fa-bolt', maxRank: 3 },
    { id: 'iron-fist', label: 'IRON FIST', description: 'Aumenta dano desarmado.', icon: 'fa-solid fa-hand-fist', maxRank: 5 },
    { id: 'big-leagues', label: 'BIG LEAGUES', description: 'Aumenta dano corpo-a-corpo.', icon: 'fa-solid fa-baseball-bat-ball', maxRank: 5 },
    { id: 'lone-wanderer', label: 'LONE WANDERER', description: 'Mais dano e resistência quando está sozinho, sem companheiro.', icon: 'fa-solid fa-person-walking', maxRank: 3 },
    { id: 'lifegiver', label: 'LIFEGIVER', description: 'Aumenta sua HP máxima.', icon: 'fa-solid fa-heart-pulse', maxRank: 3 },
    { id: 'medic', label: 'MEDIC', description: 'Itens de cura restauram mais HP.', icon: 'fa-solid fa-kit-medical', maxRank: 4 },
    { id: 'chemist', label: 'CHEMIST', description: 'Drogas e substâncias duram mais tempo.', icon: 'fa-solid fa-vial', maxRank: 2 },
    { id: 'aquaboy', label: 'AQUA BOY', description: 'Não sofre dano de radiação na água e pode respirar embaixo da água.', icon: 'fa-solid fa-water', maxRank: 2 },
    { id: 'ghoulish', label: 'GHOULISH', description: 'Radiação em pequenas doses cura sua HP em vez de causar dano.', icon: 'fa-solid fa-radiation', maxRank: 3 },
    { id: 'adamantium-skeleton', label: 'ADAMANTIUM SKELETON', description: 'Reduz dano em membros e de quedas.', icon: 'fa-solid fa-bone', maxRank: 3 },
    { id: 'cap-collector', label: 'CAP COLLECTOR', description: 'Melhores preços de compra e venda com mercadores.', icon: 'fa-solid fa-coins', maxRank: 3 },
    { id: 'local-leader', label: 'LOCAL LEADER', description: 'Permite estabelecer linhas de abastecimento e construir lojas em assentamentos.', icon: 'fa-solid fa-people-group', maxRank: 2 },
    { id: 'sneak', label: 'SNEAK', description: 'Fica mais furtivo ao se agachar ou se mover devagar.', icon: 'fa-solid fa-person-walking-arrow-right', maxRank: 5 },
    { id: 'mister-sandman', label: 'MISTER SANDMAN', description: 'Permite eliminar inimigos dormindo instantaneamente de forma furtiva.', icon: 'fa-solid fa-bed', maxRank: 3 },
    { id: 'idiot-savant', label: 'IDIOT SAVANT', description: 'Chance aleatória de ganhar XP extra em qualquer ação.', icon: 'fa-solid fa-dice', maxRank: 3 },
    { id: 'scrounger', label: 'SCROUNGER', description: 'Encontra mais munição ao revistar contêineres.', icon: 'fa-solid fa-boxes-stacked', maxRank: 4 },
    { id: 'hackers-delight', label: "HACKER'S DELIGHT", description: 'Falhar um hack não trava mais o terminal.', icon: 'fa-solid fa-microchip', maxRank: 3 },
];
