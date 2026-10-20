/**
 * Sample RPG Maker MV / MZ Data Pack
 * Used for instant live testing & demonstration without needing an external APK/ZIP file.
 */

export const SAMPLE_RPG_DATA = {
  'System.json': {
    gameTitle: 'Legend of the Aether Blade',
    currencyUnit: 'G',
    terms: {
      basic: ['Level', 'Lv', 'HP', 'HP', 'MP', 'MP', 'TP', 'TP', 'EXP', 'EXP'],
      commands: [
        'Fight',
        'Escape',
        'Attack',
        'Guard',
        'Item',
        'Skill',
        'Equip',
        'Status',
        'Formation',
        'Save',
        'Game End',
        'Options',
        'Weapon',
        'Armor',
        'Key Item',
        'New Game',
        'Continue',
      ],
      params: ['Max HP', 'Max MP', 'Attack', 'Defense', 'M.Attack', 'M.Defense', 'Agility', 'Luck'],
      messages: {
        alwaysDash: 'Always Dash',
        commandRemember: 'Command Remember',
        bgmVolume: 'BGM Volume',
        bgsVolume: 'BGS Volume',
        meVolume: 'ME Volume',
        seVolume: 'SE Volume',
        possession: 'Possession',
        expTotal: 'Current %1',
        expNext: 'To Next %1',
        saveMessage: 'Save to which file?',
        loadMessage: 'Load which file?',
        file: 'File',
      },
    },
  },

  'Actors.json': [
    null,
    {
      id: 1,
      name: 'Harold',
      nickname: 'The Chosen Vanguard',
      profile: 'A brave young swordsman from the eastern province who dreams of restoring peace to the continent.',
    },
    {
      id: 2,
      name: 'Therese',
      nickname: 'Arcane Scholar',
      profile: 'A brilliant mage researching ancient elemental magic in the Royal Academy.',
    },
    {
      id: 3,
      name: 'Marsha',
      nickname: 'Shadow Walker',
      profile: 'A stealthy scout who moves through the shadows like a gentle breeze.',
    },
  ],

  'Items.json': [
    null,
    {
      id: 1,
      name: 'Potion',
      description: 'Restores 500 HP to a single ally with soothing herbal extracts.',
    },
    {
      id: 2,
      name: 'Magic Water',
      description: 'Restores 200 MP to a single ally with distilled crystal essence.',
    },
    {
      id: 3,
      name: 'Antidote Herb',
      description: 'Cures poison and clears toxic afflictions from the body.',
    },
    {
      id: 4,
      name: 'Phoenix Feather',
      description: 'Revives a fallen ally with 25% of their maximum health restored.',
    },
  ],

  'Skills.json': [
    null,
    {
      id: 1,
      name: 'Cross Slash',
      description: 'Strikes a single foe twice with rapid blade slashes.',
      message1: 'unleashes %1!',
      message2: '',
    },
    {
      id: 2,
      name: 'Flame Burst',
      description: 'Engulfs all enemies in an explosion of intense magical fire.',
      message1: 'chants an ancient incantation for %1!',
      message2: '',
    },
    {
      id: 3,
      name: 'Holy Blessing',
      description: 'Bathes all party members in divine light, curing abnormal status effects.',
      message1: 'invokes %1 upon the party!',
      message2: '',
    },
  ],

  'Map001.json': {
    displayName: 'Verdant Haven Village',
    events: [
      null,
      {
        id: 1,
        name: 'Village Elder',
        pages: [
          {
            list: [
              {
                code: 401,
                parameters: ['\\N[1]: Elder! What happened here while I was away?'],
              },
              {
                code: 401,
                parameters: ['Elder: Alas, \\N[1]... The dark shadow has awaken in the Northern Ruins.'],
              },
              {
                code: 401,
                parameters: ['Elder: The monsters raided our storage and stole the \\C[2]Ancient Seal Stone\\C[0]!'],
              },
              {
                code: 102,
                parameters: [
                  ['I will retrieve it immediately!', 'Tell me more about the monster.', 'I need to prepare first.'],
                  0,
                  0,
                  2,
                  0,
                ],
              },
              {
                code: 401,
                parameters: ['Elder: Take these \\I[176]\\C[1]300 \\G\\C[0] and some potions from the shop. May the gods protect you!'],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        name: 'Shopkeeper Fiona',
        pages: [
          {
            list: [
              {
                code: 401,
                parameters: ['Fiona: Welcome to Verdant Supplies! Are you gearing up for an expedition?'],
              },
              {
                code: 401,
                parameters: ['Fiona: We have top quality weapons forged from starlight ore.'],
              },
            ],
          },
        ],
      },
    ],
  },
};
