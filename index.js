const chalk = require('chalk');
const fs = require('fs');
const { exit } = require('process');
const readline = require('readline');

const KEYCODES = {
    UP : '[A',
    DOWN : '[B',
    RIGHT : '[C',
    LEFT : '[D',
};
const CHARMS_REGEX = / (\d)\s?[cс]harms?/;
const PROGRESS_FILE = 'charms progress.json';

let areaPointer = 0;
let zonePointer = 0;
let charmPointer = 0;
let totalCharms = 0;
let collectedCharms = 0;
const charmData = {}
const progress = readProgress() || []

const getCurrentArea = () => Object.keys(charmData)[areaPointer];
const getCurrentZone = () => Object.keys(Object.values(charmData)[areaPointer])[zonePointer];
const getAreasArray = () => Object.values(charmData);
const getZonesArray = () => Object.values(Object.values(charmData)[areaPointer]);
const getCharmsArray = () => Object.values(Object.values(charmData)[areaPointer])[zonePointer];

function toggleCharm() {
    const progressIndex = findProgressIndex(areaPointer, zonePointer, charmPointer);
    if (progressIndex === -1) {
        const charmValue = +getCharmsArray()[charmPointer].match(CHARMS_REGEX)[1]
        progress.push({areaPointer,zonePointer,charmPointer,charmValue})
    }
    else {
        progress.splice(progressIndex, 1);
    }
    updateCollectedCharms();
    writeProgress();
}

function updateCollectedCharms() {
    collectedCharms = progress.reduce((sum, progressItem) => sum + progressItem.charmValue, 0);
}

function findProgressIndex(ap, zp, cp) {
    return progress.findIndex(p => {
        return p.areaPointer === ap && p.zonePointer === zp && p.charmPointer === cp
    })
}

async function processLineByLine(file) {
    const fileStream = fs.createReadStream(file);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    let area;
    let zone;

    for await (const line of rl) {
        if (line.startsWith('Area')) {
            area = line;
        };
        if (line.trim() && !line.match(/^\s/)) {
            zone = line;
        }

        if (line.match(CHARMS_REGEX)) {
            if (!charmData[area]) charmData[area] = {};
            if (!charmData[area][zone]) charmData[area][zone] = [];

            charmData[area][zone].push(line.trim());
        }
    }
}

function calculateTotalCharms() {
    for (const area of Object.values(charmData)) {
        for (const zone of Object.values(area)) {
            for (const charm of zone) {
                totalCharms += +charm.match(CHARMS_REGEX)[1];
            }
        }
    }
}

async function printReport() {
    const charms = getCharmsArray()


    console.clear()
    console.log(`Progression : ${collectedCharms}/${totalCharms} charms`)
    console.log(chalk.yellow(getCurrentArea()))
    console.log(chalk.yellow(getCurrentZone()))


    for (const i in charms) {
        const progressItem = findProgressIndex(areaPointer, zonePointer, +i);
        const pointer = charmPointer === +i ? ">" : "-"
        const text = ` ${pointer} ${charms[i]}`;
        
        if (progressItem === -1) {
            console.log(text);
        }
        else {
            console.log(chalk.green(text));
        }
    }
}

function debug() {
    console.clear();
    console.log("Area pointer", areaPointer);
    console.log("Zone pointer", zonePointer);
    console.log("Charms pointer", charmPointer);
    console.log("")
    console.log("Areas count", getAreasArray().length);
    console.log("Zones count", getZonesArray().length);
    console.log("Charms count", getCharmsArray().length);
}

function moveArea(iter) {
    const areasCount = Object.keys(charmData).length;

    areaPointer = (areaPointer + iter) % areasCount;

    if (areaPointer < 0) {
        areaPointer = areasCount -1;
    }
}

function writeProgress() {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function readProgress() {
    if(fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE).toString());
    }
    return null;
}

function moveZone(iter) {
    zonePointer += iter;
    const zones = Object.values(Object.values(charmData)[areaPointer]);

    if (zonePointer < 0) {
        moveArea(-1);
        const newZones = Object.values(Object.values(charmData)[areaPointer]);
        console.log(newZones)
        zonePointer = newZones.length - 1
    }
    else if (zonePointer >= zones.length) {
        zonePointer = 0;
        moveArea(1);
    }

    const charms = getCharmsArray();
    if (charmPointer >= charms.length) {
        charmPointer = charms.length - 1
    }
}

function moveCharm(iter) {
    const charms = getCharmsArray();
    charmPointer = (charmPointer + iter) % charms.length;

    if(charmPointer < 0) {
        charmPointer = charms.length -1
    }
}

async function main() {
    await processLineByLine('charms location.txt');
    calculateTotalCharms()
    updateCollectedCharms()

    readline.emitKeypressEvents(process.stdin);

    printReport();

    if (process.stdin.setRawMode != null) {
        process.stdin.setRawMode(true);
      }

    process.stdin.on('keypress', (str, key) => {
        if ( key.sequence == '\x03' ) {
            process.exit();
        }

        switch (key.code) {
            case KEYCODES.LEFT:
                moveZone(-1)
                break;
            case KEYCODES.RIGHT:
                moveZone(1)
                break;
            case KEYCODES.UP:
                moveCharm(-1)
                break;
            case KEYCODES.DOWN:
                moveCharm(1)
                break;
        
            default:
                break;
        }
        if (key.name === 'return') {
            toggleCharm();
        }
        
        printReport();
        // debug();
        // console.log(key)
      })
}


main();

