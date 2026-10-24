/**
 * Multi-Engine Sample Game Data Packs
 * Supports testing:
 * 1. RPG Maker MV / MZ (JSON data)
 * 2. Ren'Py Visual Novel (script.rpy)
 * 3. TyranoBuilder / KAG VN (scene1.ks)
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

export const SAMPLE_RENPY_DATA = {
  'game/script.rpy': `define e = Character("Eileen", color="#c8ffc8")
define p = Character("[player_name]", color="#ffffff")

label start:
    scene bg meadow
    with fade

    "The morning breeze felt crisp as sunlight filtered through the grand canopy."

    show eileen happy at center
    with dissolve

    e "Good morning, [player_name]! Welcome to our visual novel academy."
    e "Are you ready to begin your magical study expedition today?"

    menu:
        "I have been preparing all week!":
            e "Splendid! Your enthusiasm will surely guide you to greatness."
        "To be honest, I feel a little nervous...":
            e "Do not fret, [player_name]. I will be right beside you every step of the way."

    "And so, a memorable journey began in the kingdom of Lumina."

    return
`,
  'game/options.rpy': `define config.name = _("Memories of Lumina")
define gui.about = _("An enchanting Visual Novel adventure created with Ren'Py.")
`,
};

export const SAMPLE_TYRANO_DATA = {
  'data/scenario/scene1.ks': `; TyranoBuilder Scenario
[cm]
[bg storage="room.jpg" time="500"]

#Eileen
Good morning, traveler! Welcome to our visual novel realm.[p]
The wind whispers ancient secrets among the trees.[l][r]

[glink color="black" text="Enter the Magic Academy" target="*scene_academy"]
[glink color="black" text="Explore the Forest Path" target="*scene_forest"]
[s]
`,
};
