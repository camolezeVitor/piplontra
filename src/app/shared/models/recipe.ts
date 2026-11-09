/** Ingrediente/produto de receita, referenciado por `label` do catálogo (ver `Item`) — estável mesmo se o id mudar entre sessões. */
export interface RecipeIngredient {
    itemLabel: string;
    quantity: number;
}

export interface Recipe {
    id: string;
    label: string;
    icon: string;
    inputs: RecipeIngredient[];
    outputs: RecipeIngredient[];
}

/** Receitas de crafting — consomem sucata/munição/ajuda do catálogo pra produzir outros itens. */
export const RECIPES: Recipe[] = [
    {
        id: 'ammo-10mm',
        label: 'MUNIÇÃO 10MM (x20)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: '10mm Round', quantity: 20 }],
    },
    {
        id: 'ammo-308',
        label: 'MUNIÇÃO .308 (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: '.308 Round', quantity: 10 }],
    },
    {
        id: 'ammo-shotgun',
        label: 'CARTUCHO 12G (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Aluminum Can', quantity: 1 }],
        outputs: [{ itemLabel: 'Shotgun Shell', quantity: 10 }],
    },
    {
        id: 'ammo-fusion-cell',
        label: 'CÉLULA DE FUSÃO (x10)',
        icon: 'fa-solid fa-industry',
        inputs: [{ itemLabel: 'Desk Fan', quantity: 1 }, { itemLabel: 'Duct Tape', quantity: 1 }],
        outputs: [{ itemLabel: 'Fusion Cell', quantity: 10 }],
    },
    {
        id: 'aid-stimpak',
        label: 'STIMPAK',
        icon: 'fa-solid fa-kit-medical',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 2 }, { itemLabel: 'Iguana on a Stick', quantity: 1 }],
        outputs: [{ itemLabel: 'Stimpak', quantity: 1 }],
    },
    {
        id: 'aid-radaway',
        label: 'RADAWAY',
        icon: 'fa-solid fa-kit-medical',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: 'RadAway', quantity: 1 }],
    },
    {
        id: 'mod-standard-receiver',
        label: 'RECEPTOR PADRÃO',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 1 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: 'Standard Receiver', quantity: 1 }],
    },
    {
        id: 'mod-reflex-sight',
        label: 'MIRA REFLEX',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Toy Car', quantity: 1 }, { itemLabel: 'Duct Tape', quantity: 1 }],
        outputs: [{ itemLabel: 'Reflex Sight', quantity: 1 }],
    },
    {
        id: 'mod-long-barrel',
        label: 'CANO LONGO',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Adjustable Wrench', quantity: 2 }, { itemLabel: 'Desk Fan', quantity: 1 }],
        outputs: [{ itemLabel: 'Long Barrel', quantity: 1 }],
    },
    {
        id: 'mod-comfort-grip',
        label: 'PUNHO CONFORTÁVEL',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Duct Tape', quantity: 1 }, { itemLabel: 'Toy Car', quantity: 1 }],
        outputs: [{ itemLabel: 'Comfort Grip', quantity: 1 }],
    },
    {
        id: 'mod-large-magazine',
        label: 'CARREGADOR GRANDE',
        icon: 'fa-solid fa-screwdriver-wrench',
        inputs: [{ itemLabel: 'Aluminum Can', quantity: 2 }, { itemLabel: 'Adjustable Wrench', quantity: 1 }],
        outputs: [{ itemLabel: 'Large Magazine', quantity: 1 }],
    },
];
