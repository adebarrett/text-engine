// Customize bullet style.
bullet = '❦';

// Override enterRoom to show list of characters in room
const originalEnterRoom = enterRoom;
enterRoom = (id) => {
  originalEnterRoom(id);
  const room = getRoom(id);
  const characters = getCharactersInRoom(room.id);
  characters.map(c => println(`${getName(c.name)} is here.`, 'desc'));
};

// Mark the context (item) as examined.
const examine = function() {
  this.examined = true;
};

// Print room descriptions in order until they are exhausted (then repeats final description).
const getNextDescription = function(room) {
  if (this.examined) {
    return;
  }

  const nextDesc = room.descriptions.length ? room.descriptions.shift() : room.desc;
  println(nextDesc);

  if (!room.descriptions.length) {
    arrive({room});
  }

  room.desc = nextDesc;
};

// Move THIS (character) to an adjacent room along their route.
const updateLocation = function() {
  const reportEntrances = () => {
    const inRoom = getCharactersInRoom(disk.roomId);
    if (inRoom.map(r => r.name).includes(this.name)) {
      println(`${this.name} is here.`, 'desc');
    }
  }

  const route = this.routes[this.currentRoute];

  if (!route || !route.path.length) {
    return;
  }

  if (route.path.length === 1) {
    this.roomId = route.path[0];
    reportEntrances();
    return this;
  }

  if (route.type == 'patrol') {
    if (route.path.findIndex(p => p === this.roomId) == route.path.length - 1){
      route.path.reverse();
      this.roomId = route.path[1];
      reportEntrances();
      return this;
    } else {
      this.roomId = route.path[route.path.findIndex(p => p === this.roomId) + 1];
      reportEntrances();
      return this;
    }
  }
  else if (route.type == 'loop') {
    this.roomId = route.path[(route.path.findIndex(p => p === this.roomId) + 1) % route.path.length];
    reportEntrances();
    return this;
  }
  else if (route.type == 'follow') {
    let path = BFS(disk.rooms, this.roomId, disk.roomId)
    if (path.length > 1){
      this.roomId = path[1].id;
      reportEntrances();
    }
  } else if (route.type == 'simple') {
    const currentRoomIndex = route.path.findIndex(p => p === this.roomId);

    if (currentRoomIndex + 1 == route.path.length) {
      return;
    }

    this.roomId = route.path[currentRoomIndex + 1];
    reportEntrances();
  }
  else if (route.type == 'random') {
    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }
    let currentRoom = disk.rooms.find( room => room.id == this.roomId);
    let candidateRooms = currentRoom.exits.map(exit => disk.rooms.find( room => room.id == exit.id ));

    let nextRoom = candidateRooms[getRandomInt(0,candidateRooms.length - 1)];
    this.roomId = nextRoom.id;
    reportEntrances();
  } else if (route.type == 'flee') {
    let currentRoom = disk.rooms.find( room => room.id == this.roomId);
    let candidateRooms = currentRoom.exits.map(exit => disk.rooms.find( room => room.id == exit.id )).filter(room => room !== undefined);
    let fleeRoom = disk.rooms.find( room => room.id == getCharacter(route.fleeFrom).roomId);
    let candidatePaths = candidateRooms.map(cr => BFS(disk.rooms, cr.id, fleeRoom.id).length);
    var indexOfMaxValue = candidatePaths.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    let nextRoom = candidateRooms[indexOfMaxValue];
    this.roomId = nextRoom.id;
    reportEntrances();
  }
};

var adagio = document.getElementById("adagio");
var defunctis = document.getElementById("defunctis");

// Determine the topics to return for a branching conversation.
const branchingConversationTopics = (characterName) => {
  const character = getCharacter(characterName);

  const findStepWithName = name => character.conversation.findIndex((step, i) =>
    step.name == name && i > character.conversationStep
  );
  let topics;
  // let bookmark = 0;

  while (character.conversationStep < character.conversation.length) {
    let step = character.conversation[character.conversationStep];
    if (typeof step === 'function') {
      step = step();
    }
    if (step.bookmark != undefined) {
      if (typeof step.bookmark === 'string') {
        character.conversationStep = findStepWithName(step.bookmark);
      } else if (typeof step.bookmark === 'number') {
        character.conversationStep = step.bookmark;
      }
      return {};
    }

    if (step.line) {
      println(step.line);
      if (step.next) {
        // set to the "index - 1" because we increment the conversation step later
        character.conversationStep = findStepWithName(step.next) - 1;
      }
    } else if (step.question) {
      println(step.question);

      // Return the reponses as topics.
      topics = step.answers.reduce((acc, cur) => {
        acc[cur.next] = {
          option: cur.option,
          onSelected: function() {
            println(cur.line);
            character.conversationStep = findStepWithName(cur.next);
          },
        };
        return acc;
      }, {});
      break;
    }
    character.conversationStep++;
  }
  return topics || {};
};

// Handle the carriage arriving at its destination.
const arrive = ({room}) => {
  const fadeAudio = setInterval(function () {
    adagio.volume -= 0.02;
    if (adagio.volume <= 0.06) {
      clearInterval(fadeAudio);
    }
  }, 1600);

  const door = {
    name: 'door',
    desc: `It’s a door.`,
    onUse: () => {
      clearTimeout(room.openTimeout);
      println(`Uncharacteristically, you open the door rather than wait for assistance. As you exit the carriage, the servant, preoccupied with some tasks, looks to you with panic. "Pardon mademoiselle! I was coming just now to accomodate you. Please forgive my lateness. I was briefly kept by the coachman and had every intention of assisting you myself."`);
      adagio.volume = 1;
      adagio.currentTime = (8 * 60) + 47.5;
      setTimeout(() =>  enterRoom('gate'),6000);
    },
  };

  room.openTimeout = setTimeout(() => {
    println(`The servant opens the door.`),
    door.onUse = () => {
      adagio.volume = 1;
      adagio.currentTime = (8 * 60) + 47.5;
      setTimeout(() =>  enterRoom('gate'),6000);
    };
  }, 10000);

  room.items.push(door);
};

const uneBelleSoiree = {
  roomId: 'start',
  guilt: 2,
  inventory: [{
    name: ['hand-mirror', 'mirror'],
    desc: `You adjust your hair. Because of the boredom of provincial French life, what once felt like a duty has become a moment of excitement -- of diversion from your mother, your aunt, your brother. Rarely, the occasional businessmen visiting your father, none of whom you are given the opportunity to speak with.

    You feel a bit embarrassed to be preoccupied by such a thought, but you can see that it is a simple fact that you should be counted among the more handsome of debutantes. You think on OLIVIER DAUPHIN, a suitor with handsomeness to match. If only you could fulfill both your personal desires and filial duties with the same man...`,
    getNextDescription,
    examine,
    onLook: function() {
      const room = getRoom('start');
      this.getNextDescription(room);
      this.examine();
    },
    onUse: function() {
      println(this.desc);
      const room = getRoom('start');
      this.getNextDescription(room);
      this.examine();
    },
  }, {
    name: 'ring',
    desc: `The ring was a gift from your father to your mother. You absentmindedly spin it on your finger and wonder, might you meet someone at the gathering? Someone who desires to adorn you with fine clothing and jewelry? Adornments you might lend your own daughters one day?

    While ARMAND DAUPHIN may not afford the same interest as his brother, I’m certain he can afford quite a lot on nine thousand marcs per annum.`,
    getNextDescription,
    examine,
    onLook: function() {
      const room = getRoom('start');
      this.getNextDescription(room);
      this.desc = `It was a gift from your father to your mother.`;
      this.examine();
    },
  }],
  rooms: [
    {
      name: 'Carriage',
      id: 'start',
      img: ``,
      descriptions: [
        `Underneath the beating of the hooves, you can hear the cicadas and bullfrogs of summer. The smell of cut hay drifts into the coach. There is a hand-mirror in your pocket.`,
        `The irregular rhythms of the carriage over ruts in the country mud begin to turn to the even humming of paved roads. In the distance, the haze of harvest begins to be illuminated by the lights of a far off estate, which is just now becoming encircled with a light fog.`,
        `The light from the estate half-discloses the statuary that lines the entrance. From the roadside you hear the shouts of stablemen. Farther away, as quiet as a whisper, is a strange and exotic song.`,
        `The carriage comes to a stop. You can't make out the details, but the coachman is in some sort of conversation concerning the logistics of stabling the horses. Approaching the carriage is a servant of the House of Dauphin. You glance at the door.`,
      ],
      items: [{
        name: ['invitation', 'letter'],
        desc: `You'll have to pick it up. Try: TAKE INVITATION`,
        examined: false,
        isTakeable: true,
        examine,
        getNextDescription,
        onTake: function() {
          adagio.play();
          const room = getRoom('start');
          this.getNextDescription(room);
          this.desc = `In bold typeset and surrounded by Parisian filligree you read:

          Mlle. Cassat is requested to attend the ball at Chateau de Dauphin on Tuesday the 1st of June at 8'00 PM.

          Handwritten in the bottom-right corner is a personal note:

          My sons have expressed a special interest in your presence! I know that either would be keen to dance. -Mlle. Dauphin`;

          this.onLook = function() {
            this.getNextDescription(room);
            this.examine();
          };
        },
      },
      ],
      onEnter: () => {
        const room = getRoom('start');

        if (room.visits === 1) {
          println(`WARNING: This game deals with very dark themes and includes graphic descriptions of violence.`);
          println(`You catch yourself as your head falls toward your shoulder. You always find the steady beat of hooves outside the carriage window to have a hypnotic effect. The invitation you held in your hand has fallen to the carriage floor.`);

          room.desc = `There is an invitation on the floor.`;
        }
      },
    },
    {
      name: 'Gate',
      id: 'gate',
      desc:`A servant ushers you forward through the wrought iron gates that disappear into the hedge at both ends.
      The fog that seemed to envelop the estate while riding from the carriage appears as a light mist here.
      Long rays of light illuminate the wet stone pathway in front of you to the NORTH. Behind you the carriage drives on.`,
      exits: [
        { dir: ['north', 'in'], id: 'insideGate' }
      ],
      img:`
      ##::::'##:'##::: ##:'########::::'########::'########:'##:::::::'##:::::::'########:::::'######:::'#######::'####:'########::'########:'########:
      ##:::: ##: ###:: ##: ##.....::::: ##.... ##: ##.....:: ##::::::: ##::::::: ##.....:::::'##... ##:'##.... ##:. ##:: ##.... ##: ##.....:: ##.....::
      ##:::: ##: ####: ##: ##:::::::::: ##:::: ##: ##::::::: ##::::::: ##::::::: ##:::::::::: ##:::..:: ##:::: ##:: ##:: ##:::: ##: ##::::::: ##:::::::
      ##:::: ##: ## ## ##: ######:::::: ########:: ######::: ##::::::: ##::::::: ######::::::. ######:: ##:::: ##:: ##:: ########:: ######::: ######:::
      ##:::: ##: ##. ####: ##...::::::: ##.... ##: ##...:::: ##::::::: ##::::::: ##...::::::::..... ##: ##:::: ##:: ##:: ##.. ##::: ##...:::: ##...::::
      ##:::: ##: ##:. ###: ##:::::::::: ##:::: ##: ##::::::: ##::::::: ##::::::: ##::::::::::'##::: ##: ##:::: ##:: ##:: ##::. ##:: ##::::::: ##:::::::
     . #######:: ##::. ##: ########:::: ########:: ########: ########: ########: ########::::. ######::. #######::'####: ##:::. ##: ########: ########:
     :.......:::..::::..::........:::::........:::........::........::........::........::::::......::::.......:::....::..:::::..::........::........::`
    },
    {
      name: 'Inside Gate',
      id: 'insideGate',
      exits: [
        { dir: ['south', 'out'], id: 'gate' },
        { dir: 'north', id: 'fountain' }
      ],
      onEnter() {
        this.desc = `${this.visits == 1 ? 'The servant escorts you through' : 'You are surrounded by' } two walls of well-kempt hedges. Atop each hedge are improbably shaped silhouettes of well-manicured topiaries. You can't make out their height as their tops are obscured by the mist and the night.`;
        println(this.desc);
      }
    },
    {
      name: 'Fountain',
      id: 'fountain',
      exits: [
        { dir: 'south', id: 'insideGate' },
        { dir: 'north', id: 'outerCourt' },
        { dir: 'east', id: 'eastHedge' },
        { dir: 'west', id: 'westHedge' },
        // { dir: 'center', id: 'fountainCenter' },
      ],
      items:[
        {name: ['dionysus','statue'], 'desc':'Frozen in a moment of orgiastic glee, balancing on the one foot of which he seems to be in control. Around his head is a bronze laurel, and oddly at his feet amid the crushed grapes, are pineapples and eucalytpus branches.'},
        {name: ['fountain','water'], 'desc':`The fountain is large enough that the center can not be reached except by wading through the waters.  It’s too dark to see the bottom, but if it’s like other fountains it is likely knee-deep at most.  The courtyard is filled with the thundering weight of the water falling from the statue’s vase`},
        {name: ['vase'], 'desc':`Something is written on it, but it’s too dark to see, looks like greek possibly?`},
      ],
      onEnter() {
        this.desc = `${this.visits == 1 ? 'The servant has recovered an air of formality, and is sinking back into a comfortable role and station. He smells heavily of hay and sweat.' : ''} Here, the foliage is trimmed into a rectangular courtyard. In the center of the courtyard is a large fountain -- a bronze dionysus pours water with revelry from a bacchanalian vase into the water below.`;
        println(this.desc);
      },
    },
    {
      name: 'Outer Court',
      id: 'outerCourt',
      desc:[`Vines grow up the courtyard walls. To the NORTH, the windows of the house are well lit, each producing its own faint halo in the mist.`],
      items:[{name: ['vines', 'walls'], desc:`The vines seem uncharacteristically tenebrous. It looks like they may even have compromised the wall’s structural integrity.`}],
      exits: [
        { dir: 'north', id: 'innerCourt' },
        { dir: 'south', id: 'fountain' },
      ],
    },
    {
      name: 'Inner Court',
      id: 'innerCourt',
      desc:[`The courtyard is well illuminated. The marble stairs to the NORTH look as if they were recently constructed. The lawn is scattered with impressive gardens, and small ponds seem to be sourced from redirected streams somewhere else on the grounds.`],
      exits: [
        { dir: 'south', id: 'outerCourt' },
        { dir: 'north', id: 'grandPorch' },
      ],
    },
    {
      name: 'West Hedge',
      id: 'westHedge',
      desc:[`It’s difficult to see, but there seems to be a small stone statue in the southwest corner of this opening`],
      items:[
        {name: ['statue', 'brigid'], desc: `Incense seems to have been recently burned here. A small cup of liquid and a cross lay at the saint’s feet. ‘Brigid Of Kildare’ is engraved on to the statue’s base. `},
        {
          name: ['cup','liquid','rum'],
          desc: 'Some kind of alcohol, maybe?',
          isTakeable:true,
          onUse: function(){
            println('Rum. That was definitely some kind of strong rum.');
            disk.guilt++;
            let toBeRemovedIndex = this.items.findIndex(item => item.name[0] == 'cup');
            this.items = this.items.splice(toBeRemovedIndex,1);
          }
        },
        {name: ['cross'], desc: 'A cross carved from a dark wood. Looks like ebony.', isTakeable:true, onTake: () =>{
          // TODO
        }},
      ],
      exits: [
        { dir: 'east', id: 'fountain' },
      ],
    },
    {
      name: 'East Hedge',
      id: 'eastHedge',
      desc: `Too dark to see. The very top of the hedge is illuminated by a wedge of light coming from the house.`,
      exits: [
        { dir: 'west', id: 'fountain' },
      ],
    },
    {
      name: 'Grand Porch',
      id: 'grandPorch',
      desc: `The front of the Dauphin home is encircled by a large marble porch with ornate railing. In the moonlight, and from the relative height of the porch, you can see the entirety of the large moonlit lawn.`,
      items:[
      {name: 'house', desc:`Your mother told you the GRANDFATHER DAUPHIN bought the house when she was a girl, but it was constructed several centuries ago and has changed ownership several times.`},
      {name: 'lawn', desc:`It seems to have many small spaces partitioned by hedges, and networked with long pathway.`}
    ],
      exits: [
        { dir: 'south', id: 'innerCourt' },
        { dir: 'north', id: 'entry' },
        { dir: 'east', id: 'eastPorch' },
        { dir: 'west', id: 'westPorch' },
      ],
    },
    {
      name: 'East Porch',
      id: 'eastPorch',
      desc: `From high on the porch, but near the east railing you can see, tucked behind the home and a row of columnar trees, is the practical workbuildings of the estate: sheds, coops, and a conspicuous greenhouse.`,
      items:[{'name':['coop','coops'], desc: `Very faintly from the coops you can hear an unusuaally loud clamor of a rooster. It’s calls are muffled here, but it must be loud to be carrying this far`}],
      exits: [
        { dir: 'west', id: 'grandPorch' },
      ],
    },
    {
      name: 'West Porch',
      id: 'westPorch',
      desc: `More of the same moonlit lawn heavily decorated with large patterns in the Hedges, in the distance you can see the lanterns of the stable hands as they tend to the riding equipment`,
      exits: [
        { dir: 'east', id: 'grandPorch' },
      ],
    },
    {
      name: 'Entry',
      id: 'entry',
      desc: `Ornate mahogany panels surround the entrance to the home, the room seems impossibly tall. A large staircase leads up to a landing overlooking the entry room, and the grand salon.  Oil paintings adorn the walls in the room.`,
      items: [
        {name:['gallery','portraits','paintings'], desc:`Portraits of the Dauphins, some look to be more than a hundred years old. Broken occasionally by romaniticizations of provincial french landscape`},
        {name:['panels'], desc:`The panels seem to be made of the same wood as the similarly ornate moulding around the room. Father would have remarked unhappily at such a frivilous expense, were he here`},
      ],
      exits: [
        { dir: 'south', id: 'grandPorch' },
        { dir: 'north', id: 'grandSalon' },
        { dir: 'east', id: 'sittingRoom'},
        { dir: 'west', id: 'library', block:'Something is keeping the door from opening!'},
        { dir: 'up', id: 'landing'},
      ],
    },
    {
      name: 'Grand Salon',
      id: 'grandSalon',
      desc:[`A large circular room, the old salle de garde, now a salon. Elaborate embellishments on the ceiling border on onstentataious. The room is alive with chatter. A truly impressive spread of fruits, and game is available on the west side of the room.  A harpsichord is playing a minuet in the southwest corner.`],
      exits: [
        {dir: 'south', id: 'entry'},
        {dir: 'north', id: 'backLawn'},
        {dir: 'east', id: 'kitchen', block: `The eastern door leads to the Kitchen. You decide to avoid needlessly encouraging the censure and gossip of the guests of the house by mingling openly with the kitchen staff.
        You can well imagine: “Is she for want of equal company?”, “Perhaps she’s accustomed to onions straight from the garden! These dishes have not enough dirt for her liking?”`},
        {dir: 'west', id: 'westhall'},
      ],
    },
    {
      name: 'Sitting Room',
      id: 'sittingRoom',
      desc:[`Sofas are arrange to absorb heat from the sun during winter. `],
      items:[
        {name:['sofa'], desc:`Profusely decorated acanthus floral wood frames plush upholstery, somewhat faded from years in the sun`},
      ],
      exits: [
        { dir: 'west', id: 'entry'},
        { dir: 'north', id: 'kitchen'},
      ],
    },
    {
      name: 'Library',
      id: 'library',
      desc: `Bookshelves line the entirety of the room. They look well-kept, in fact many look untouched. The shelves in the northwest corner hold a number of large volumes with similar binding. You suspect from the width of a few locked cabinet doors that they house shelves of private information `,
      items:[
        {name: 'law', desc: `One section seems to be organized around law and legal theory. Loose folios of Montesquieu, are packed tightly on the lowest shelf. The rest seem to be analyses of various cases in maritime law, that Mr. Dauphin has had bound himself`},
        {name: 'reference', desc: `Atlases, encyclopedias, historical records.  Oddly many of the historical records are in Spanish, several histories, and short articles and a prominent tome by Bartolome De Las Casaas and another set of the correspondence of Nicolás de Ovando`},
        {name: 'atlas', desc:`You unshelf one of the Atlases out of curiousity, and thumb through. It’s an atlas of the Americas. Largely focused on the Carribean, and Florida. A piece of paper covered in numbers, has apparently been used as a bookmark on an old record of Spanish Hispaniola.`},
        {name: 'economy', desc:`Some of the older untouched books appear to be about Flemish financial practices, newer tomes seem to be centered on the production, trade, and markets of indigo, tobacco, and sugar`},
        {name: 'cabinet', desc:`It’s locked.`},
      ],
      exits: [
        { dir: 'east', id: 'entry' },
        { dir: 'west', id: 'chapel'},
        { dir: 'north', id: 'westhall'},
      ],
    },
    {
      name: 'Chapel',
      id: 'chapel',
      desc:[`The southern side of the chapel has large stained glass windows, the moonlight barely illuminates the chapel, the front of the chapel is illuminated by a large candle stand, covered in votive candles. From their light you can see an almost-life-size wooden Christ gazing at the candles in perpetual agony.`],
      items:[
        {name:['candles'], desc:'They’re candles'},
        {name:['christ'], desc:'It’sa me, Jesusa Christa'},
        {name:['candies'], desc:'It’sa me, Jesusa Candiesa'}
      ],
      exits: [
        { dir: 'east', id: 'library' },
      ],
      onEnter() {
        defunctis.play();
      },
    },
    {
      name: 'West Hall',
      id: 'westhall',
      desc:[`A hall extending from the Grand Salon to the study, a door to the NORTH lead to a vestibulary `],
      exits: [
        { dir: 'south', id: 'library' },
        { dir: 'east', id: 'grandSalon'},
        { dir: 'west', id: 'study' },
      ]
    },
    {
      name: 'Landing',
      id: 'landing',
      desc:[`You get the feeling you aren't meant to be up here, but no one seems to notice you, from here you can see the guests in the grand salon conversing.`],
      exits: [
        { dir: 'down', id: 'entry' }
      ]
    },
    {
      name: 'Study',
      id: 'study',
      desc:[`A private study, it smell so strongly of tobacco it clearly doubles as a smoking room, a large wooden desk, is surrounded by exotic artifacts. `],
      exits: [
        { dir: 'east', id: 'westhall' }
      ]
    },
    {
      name: 'Kitchen',
      id: 'kitchen',
      desc: `The room is hot, and very uncomfortable, you worry that the floor will dirty your gown, everyone stops and looks up from their task. You feel very out of place.  Game is being carved on a large wooden table. Vegetables from the garden are being washed in a stone basin.`,
      onEnter: function() {
        this.desc = `The room is hot, and very uncomfortable.  Game is being carved on a large wooden table. Vegetables from the garden are being washed in a stone basin.`;
      },
      exits: [
        { dir: 'south', id: 'sittingRoom' },
        { dir: 'west', id: 'grandSalon' },
        { dir: 'east', id: 'pantry' },
      ]
    },
    {
      name: 'Pantry',
      id: 'pantry',
      desc: `Shelving wraps around the pantry. Apricots, plums, a basket full of celery and onions. On a back shelf, in between a shelf of breads and one of dried fish, is a glass eye.

      An herby aroma of turnips, rutabaga, radishes, potatoes, and carrots wafts up the staircase.`,
      items: [
        {name: ['glass eye', 'eye'], desc: `Here’s looking at you, cod.`},
      ],
      exits: [
        {dir: 'east', id: 'garden'},
        {dir: 'down', id: 'rootCellar'},
      ],
    },
    {
      name: 'Garden',
      id: 'garden',
      desc: `Rows of trellises and beanpoles stretch out in front of you. The perimeter of the garden is surrounded by mature nut trees. Pecan and walnut you recognize, but there are varieties you’ve never seen before.`,
      items: [{name: 'eye', desc: `Here's looking at you, cadydid.`}],
      exits: [
        {dir: 'west', id: 'pantry'},
      ],
    },
    {
      name: 'Root Cellar',
      id: 'rootCellar',
      desc: `The root cellar is only faintly illuminated, but the subterranean shelving appears to continue rightward towards a large, wooden door with a wrought-iron handle.

      The smell of dirt and tubers hangs thick in the air.`,
      items: [
        {name: 'door', desc: ``},
        {name: ['door handle', 'handle'], desc: ``},
      ],
      exits: [
        {dir: 'up', id: 'pantry'},
      ],
    },
    {
      name: 'Coal Cellar',
      id: 'coalCellar',
      desc: `You choke on the dust you’ve stirred up in the room. A black, coarse powder sticks to the sweat on your skin. Only a thin beam of light pierces the dark, coming from a large, tin door directly in front of you.`,
      exits: [
        {dir: 'up', id: 'westLawn'},
      ],
    },
    {
      name: 'West Lawn',
      id: 'westLawn',
      desc: ``,
      exits: [
        {dir: 'down', id: 'coalCellar'},
      ],
    },
  ],
  characters: [
    {
      name: ['Gaspard', 'servant'],
      desc: 'Servant of the Dauphin household, tasked with welcoming guests.',
      routes: {
        helpingGuests: {
          path: ['kitchen', 'insideGate', 'fountain', 'outerCourt', 'innerCourt'],
          type: 'flee',
          fleeFrom: 'Richard'
          },
        investigatingSound: {
          path: ['fountain', 'eastHedge', 'fountain', 'westHedge', 'innerCourt'],
          type: 'loop',
        }
      },
      updateLocation,
      currentRoute: 'helpingGuests',
      roomId: 'kitchen',
      topics: ({room}) => {
        if (room.id === 'fountain') {
          return [{
            option: 'Talk about the FOUNTAIN',
            onSelected: () => {
              println('This fountain was installed by Count Dauphin, it is a recent addition.');
              endConversation();
            },
          }];
        }

        if (getCharacter('gaspard').currentRoute === 'helpingGuests') {
          return [{
            option: 'Ask that he ESCORT you to the party',
            onSelected: () => {
              println('Right this way, madame.');
              endConversation();
            },
          }];
        }

        return [];
      },
    },
    {
      name: 'Richard',
      desc: 'The youngest of the Jeannin family, handsome and good-natured; but recently bethrothed to Miss Blackwood.',
      routes: {
        arriving: {
          path: ['grandSalon',''],
          type: 'follow',
        },
        walkingTheGrounds: {
          path: ['eastPorch', 'grandPorch', 'westPorch', 'innerCourt', 'outerCourt', 'fountain'],
            type: 'patrol',
          },
      },
      conversation: [
        {question: `“I'm sorry have we met?” Richard asks, before adding, “Ah, you must be from the Cassat family, yes?  Please send your father my warmest regards. I trust your mother and father are in good health?”`, answers: [
          {option: `Say YES`, next: 'yes'},
          {option: `ASK about Richard’s family`, next: 'ask'},
        ]},
        {name: 'yes', line: `“They are both of excellent health, thank you,” you reply.`, next: 'end'},
        {name: 'ask', question: `“They are,” you reply, “And yours as well I trust?”
        “My mother yes,” Richard says, “But unfortunately my father Edoard is quite sick.”`,
        answers: [
          {option: `ASK about father’s illness`, next: 'ask'},
          {option: `END the conversation`, next: 'end'},
        ]},
        {name: 'ask', line: `He seems uncomfortable discussing the topic. “Malaria, they say...”`},
        {name: 'end'},
        {line: `“Well I should join Miss Blackwood on her walk around the grounds,” he says with a bow. “I’m sure we will be speaking more this evening! A pleasure.”`},
      ],
      conversationStep: 0,
      updateLocation,
      currentRoute: 'arriving',
      roomId: 'grandSalon',
      topics: () => branchingConversationTopics('richard'),
    },
    {
      name: ['Grandfather Dauphin', 'Gramps'],
      desc: `The eldest Dauphin was once known for his cosmopolitan adventurism. At seventy-nine, he has become increasingly devout.

He is clutching a rosary near the front of the chapel. Sweat accumulates around his collar and drips from his brow. He is quietly muttering to himself, presumably praying.`,
      routes: {
        retire: {
          path: ['chapel', 'library', 'entry', 'landing'],
          type: 'simple',
        },
      },
      roomId: 'chapel',
      conversation: [
        {
          question: `“Hail Mary, full of grace,
  the Lord is with thee.
  Blessed art thou amongst women,
  and blessed is the fruit of thy womb, Jesus.”`,
          answers: [
            {option: `INTERRUPT Grandfather Dauphin`, next: `interrupt`},
            {option: `LEAVE him be`, next: 'leave'},
          ]
        },
        {
          name: 'interrupt',
          question: `“The party’s in the salon,” he scowls. “You’re not meant to be here.”`,
          answers: [
            {option: `PRESS him`, next: 'press', line: `“Terribly sorry, Sir,” you reply. “I wished to see the chapel; I had no intention of trespassing on your communion, I confess I admired the fervor of your penitance--”`},
            {option: `Just LEAVE`, next: 'leave'},
          ],
        },
        {
          name: 'press',
          question: `“Penitance?” he replies, anger in his voice. You feel a little embarrased at having landed unconsciously on that word. “Who exactly are you? And who invited you into my home?”`,
          answers: [
             {option: `IDENTIFY yourself`, next: 'identify', line: `“I am Emille Cassat,” you tell him with pride, “daughter of Frederic Cassat--”`},
             {option: `Just LEAVE`, next: 'leave'},
           ]
        },
        function identify() {
          const gramps = getCharacter('Grandfather Dauphin');
            gramps.currentRoute = 'retire';
            gramps.updateLocation();
            disk.inventory.push({
              name: 'rosary',
            });
            disk.guilt--;

          return {
            name: 'identify',
            line: `At the sound of your family name, Dauphin unclenches his jaw. With a short, contemptuous laugh, he forcefully takes your wrist and thrusts his rosary into your palm.

            “You may need this more than I.”`
          };
        },
        function leave() {
          const haveRosary = !!disk.inventory.find((item) => item.name == 'rosary');

          if (!haveRosary) {
            println('You politely end the conversation.');
          }
          return {
            name: 'leave',
            bookmark: haveRosary ? 4 : 0,
          };
        },
      ],
      conversationStep: 0,
      topics: () => branchingConversationTopics('gramps'),
      updateLocation,
    },
    {
      name: ['René Dauphin', 'Rene Dauphin', 'René', 'Rene'],
      desc: 'A middle-aged gentleman of a comfortable and substantial size and somewhat scarred from a childhood pox.  Mother explained to you his lineage prior to your attendance tonight. He is The second child of Dauphin family, the eldest male, and stands to inherit the Dauphin estate upon the death of Grandfather Dauphin.',
      routes: {
        cavorting: {
          path: ['entry', 'grandSalon'],
          type: 'patrol',
        },
      },
      conversation: [
        {
          question: `“Mlle. Cassat  welcome!” René says, “You may have arrived just in time, I’ve just exhausted my last anecdote, and these good guests here have suffered through them in your place!”`,
          answers: [
            {option: `SMILE and say not at all`, next: 'smile'},
            {option: `Stay SILENT and refuse to humor him`, next: 'silent'},
            {option: `You LAUGH at his joke`, next: 'laugh'},
          ],
        },
        {
          name: 'smile',
          line: `“Well, you may have to suffer through a few after all, then,” he says.`,
          next: 'food',
        },
        {
          name: 'silent',
          line: `René’s good humor melts away and he looks embarrassed.`,
          next: 'food',
        },
        {
          name: 'laugh',
          line: `You laugh politely.`,
          next: 'food',
        },
        {
          name: 'food',
          line: `“I believe they have just finished preparing the table in the GRAND SALON,” he says. “We have enough food here to make everyone sick several times over. Please take whatever you want.
          “Eloise is anxious to speak with you again. She is waiting for you in the SITTING ROOM.`,
        },
        {
          question: `“And my sons are here, of course.”`,
          answers: [
            {option: `Inquire after OLIVIER`, next: 'olivier'},
            {option: `Inquire after ARMAND`, next: 'armand'},
            {option: `EXCUSE yourself`, next: 'excuse'},
          ],
        },
        {
          name: 'olivier',
          line: `“Against my protestations, Olivier went pheasant-hunting today,” he explains. “I believe he is still upstairs, but he should be down shortly.”`,
          next: 'end',
        },
        {
          name: 'armand',
          line: `“Armand is meant to be in the GRAND SALON,” he tells you. “However, it is likely he has found his way back into the study. He is increasingly difficult to separate from his ledger.”`,
          next: 'end',
        },
        {
          name: 'excuse',
          next: 'end',
        },
        {
          name: 'end',
          line: `“Please give your father my warmest regards,” he tells you. “Should you need me tonight, I won’t be far.”`,
        },
      ],
      conversationStep: 0,
      updateLocation,
      currentRoute: 'cavorting',
      roomId: 'entry',
      topics: () => branchingConversationTopics('rene'),
    },
    {
      name: ['Marie Dauphin', 'Marie'],
      desc: 'The wife of René, she is a woman who cannot help but appear miserable. She married at eighteen and produced him two sons, both handsome, and one capable. Mother said she is from a family of dubious connection to the Bourbons, and so is unlikely to approve of matrimonial arrangements beneath her imagined station.',
      routes: {
        cavorting: {
          path: ['grandSalon'],
          type: 'patrol',
        },
      },
      conversation: [],
      conversationStep: 0,
      updateLocation,
      currentRoute: 'cavorting',
      roomId: 'grandSalon',
      topics: () => branchingConversationTopics('marie'),
    },
    {
      name: ['Eloise Abbiati', 'Eloise'],
      desc: `Grandfather Dauphin’s eldest daughter. She is two years the senior of René. You are lead to understand that when she was courting, she was an accomplished harpsichordist (a hobby she subsequently replaced with opium).`,
    },
    {
      name: ['Matteo Abbiati', 'Matteo'],
      desc: `Husband to Eloise, he hails from the Amalfi Coast of Campania. Tolerated in the Campanian Halls of Learning, he imagines himself to be a philosopher, and as the rich son of a Spanish prince, his colleagues are want to disillusion him.`,
    },
    {
      name: ['Henri Dauphin', 'Henri'],
      desc: `René’s younger brother. He is unwed -- to the relief of not only himself, but also his potential sutresses.`,
    },
    {
      name: ['Olivier Dauphin', 'Olivier'],
      desc: `Exceedingly handsome, and not only because he is young. He is a most agreeable match, though not necessarily advantageous. His elder brother, Armand, stands to inherit the fortune of the Dauphin family. Surely Mother and Father would consider any connection to the Dauphin family to be a consolation prize.`,
    },
    {
      name: ['Armand Dauphin', 'Armand'],
      desc: `Exceedingly serious man of business. He has little to recommend him in his countenance, disposition, creative talents, courtly behavior, or wit. And yet, his pocketbook...`,
    },
    {
      name: ['The Vicar', 'Vicar'],
      desc: `The obsequious vicar of the local parish who enjoys nothing so much as the condescension of the Dauphin family.`,
    }
  ],
};

const adjMatrix = uneBelleSoiree.rooms.map( row => uneBelleSoiree.rooms.map(column => (row && row.exits && row.exits.map(r => r.id ).includes(column.id)) ? column.id : 0));

// 1 procedure BFS(G, root) is
// 2      let Q be a queue
// 3      label root as discovered
// 4      Q.enqueue(root)
// 5      while Q is not empty do
// 6          v := Q.dequeue()
// 7          if v is the goal then
// 8              return v
// 9          for all edges from v to w in G.adjacentEdges(v) do
// 10             if w is not labeled as discovered then
// 11                 label w as discovered
// 13                 Q.enqueue(w)

const BFS = (G, root, goal) => {
  const Q = [];
  const discovered = [];
  discovered.push(root);
  Q.push(G.find(element => element.id == root));
  while (Q.length > 0){
    const v = Object.assign({}, Q.shift());
    if (v.id === goal){
      const path = [];
      const getPath = (node) => {
        path.push(node);
        if (node.id == root) {
          return;
        }
        getPath(node.previous);
      }
      getPath(v);

      return path.reverse();
    }
    (v.exits || []).forEach(exit => {
      if (!discovered.find(elem => elem == exit.id)){
        const nextRoom = Object.assign({}, G.find(element => element.id == exit.id));
        nextRoom.previous = v;
        discovered.push(nextRoom.id);
        Q.push(nextRoom);
      }
    });
  }
};

// Debugging: Allow pressing > to force characters to move to adjacent rooms.
document.onkeypress = function (e) {
  if (e.keyCode == 62) {
    disk.characters.map(c => c.updateLocation({println, disk}));
  }
};
