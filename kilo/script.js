// Variables
var room;
var level;
var batterychecktimer;
var savepositionbyminutestimer;
var accel = new THREE.Vector3(0, 0, 1);
const date = new Date();
function positionvariable(x, y, z, time, event) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.time = time;
    this.event = event;
}
const currentposition = new positionvariable(0, 0, 0, 0, "");
const position = new positionvariable(0, 0, 0, 0, "");
const positionbyseconds = [];
const positionpastminutetimevalues = [];
const positionpastminutexvalues = [];
const positionpastminuteyvalues = [];
const positionpastminutezvalues = [];
for (let i = 0; i < 93; i++) {
    positionbyseconds[i] = { x: 0, y: 0, z: 8000, time: date.getTime() };
    positionpastminutexvalues[i] = 0;
    positionpastminuteyvalues[i] = 0;
    positionpastminutezvalues[i] = 0;
    positionpastminutetimevalues[i] = (date.getTime() - 650 * (92 - i));
}
const positionbyminutes = [];
var eventtext;
eventtext = "";
positionbyminutes[0] = { x: 0, y: 0, z: 8000, time: date.getTime(), event: "start" };

// Code to upload to Bangle.js
var BANGLE_CODE = `
Puck.on('accel',function(a) {
  var d = [
    "A",
    a.acc.x, a.acc.y, a.acc.z
    ];
  Bluetooth.println(d.join(","));
});
Puck.accelOn(1.6);
NRF.setTxPower(4);
`;

// When we click the connect button...
var connection;
function connectclick() {
    // disconnect if connected already
    if (connection) {
        connection.close();
        connection = undefined;
    }
    // Connect
    Puck.connect(function (c) {
        if (!c) {
            alert("Couldn't connect!");
            return;
        }
        connection = c;
        // Juliet code
        document.getElementById("btnConnect").disabled = true;
        document.getElementById("btnDisconnect").disabled = false;
        batterychecktimer = setInterval(batterycheck, 1000 * 60 * 10);
        savepositionbyminutestimer = setInterval(savepositionbyminutesclick, 1000 * 60 * 60);

        // Handle the data we get back, and call 'onLine'
        // whenever we get a line
        var buf = "";
        connection.on("data", function (d) {
            buf += d;
            var l = buf.split("\n");
            buf = l.pop();
            l.forEach(onLine);
        });
        // First, reset the Bangle
        connection.write("reset();\n", function () {
            // Wait for it to reset itself
            setTimeout(function () {
                // Now upload our code to it
                connection.write("\x03\x10if(1){" + BANGLE_CODE + "}\n",
                    function () { console.log("Ready..."); });
            }, 1500);
        });
    });
};

// When we get a line of data, check it and if it's
// from the accelerometer, update it
function onLine(line) {
    console.log("RECEIVED:" + line);
    var d = line.split(",");

    // Check if data is the battery level
    if (d.length == 1 && d[0].length < 5 && parseInt(d[0].substr(1, d[0].length - 1)) >= 0 && parseInt(d[0].substr(1, d[0].length - 1)) <= 100) {
        console.log("parseInt(d[0].substr(1,2)):" + parseInt(d[0].substr(1, d[0].length - 1)))
        document.getElementById("batterylevel").value = parseInt(d[0].substr(1, d[0].length - 1));
    }

    if (d.length == 4 && d[0] == "A") {
        // we have an accelerometer reading
        // From juliet accelcollect
        const accelcollectdate = new Date();
        //Get accel data
        accel.x = parseInt(d[1]);
        currentposition.x = accel.x;
        accel.y = parseInt(d[2]);
        currentposition.y = accel.y;
        accel.z = parseInt(d[3]);
        currentposition.z = accel.z;
        currentposition.time = accelcollectdate.getTime();
        connection.write("digitalPulse(LED2, 1, 200);\n");
        //Render Vector3
        render();

        //update positionbyseconds using an intermediary
        let positiontoadd = new positionvariable();
        positiontoadd.x = currentposition.x;
        positiontoadd.y = currentposition.y;
        positiontoadd.z = currentposition.z;
        positiontoadd.time = currentposition.time;
        positionbyseconds.pop;
        positionbyseconds.unshift(positiontoadd);

        //Update past minute chart, most recent position at end of array
        positionpastminutexvalues.push(currentposition.x);
        positionpastminutexvalues.shift();
        positionpastminuteyvalues.push(currentposition.y);
        positionpastminuteyvalues.shift();
        positionpastminutezvalues.push(currentposition.z);
        positionpastminutezvalues.shift();
        positionpastminutetimevalues.push(currentposition.time);
        positionpastminutetimevalues.shift();
        chartpositionpastminute.update("none");
        //go to updateminute data function with every new accel position
        updateminutedata(currentposition);
    }
}

// Collect battery level based on a timer...
async function batterycheck() {
    let myPromise = new Promise(function (myResolve, myReject) {
        //myResolve(Puck.eval("E.getBattery()"));
        myResolve(connection.write("E.getBattery();\n"));
    });
}

// When we click the disconnect button...
function disconnectclick() {
    document.getElementById("btnConnect").disabled = false;
    document.getElementById("btnDisconnect").disabled = true;
    connection.write('reset();\n');
}

// When we click the savepositionbymimutesbutton button...
function savepositionbyminutesclick() {
    //create an array from the data
    const csvstring = [
        [
            "X",
            "Y",
            "Z",
            "Time",
            "Event"
        ],
        ...positionbyminutes.map(item => [
            item.x,
            item.y,
            item.z,
            item.time,
            item.event
        ])
    ];
    let csvcontent = "data:text/csv;charset=utf-8,";
    csvstring.forEach(function (rowArray) {
        let row = rowArray.join(",");
        csvcontent += row + "\r\n";
    });
    const savepositionbyminutesdate = new Date();
    var savepositionbyminutestime = savepositionbyminutesdate.getTime();
    var encodedUri = encodeURI(csvcontent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", level + "-" + room + "-" + savepositionbyminutestime + ".csv");
    document.body.appendChild(link);
    link.click();
}

// When we click the btnVerifyHand button...
function verifyhandclick() {
    document.getElementById("btnVerifyHand").disabled = true;
    document.getElementById("btnVerifyHand").style.backgroundColor = "#5cb85c";
    document.getElementById("btnVerifyHand").innerHTML = "Verified";
    eventtext = "verified by hand"
}

// When we click the btnVerifyFeet button...
function verifyfeetclick() {
    document.getElementById("btnVerifyFeet").disabled = true;
    document.getElementById("btnVerifyFeet").style.backgroundColor = "#5cb85c";
    document.getElementById("btnVerifyFeet").innerHTML = "Verified";
    eventtext = "verified by feet"
}

function updateminutedata(inputposition) {
    if (inputposition.time - positionbyminutes[(positionbyminutes.length - 1)].time >= 60000) {
        let averagex = 0;
        let averagey = 0;
        let averagez = 0;
        let timetoadd = 0;
        for (let i = 0; i < 93; i++) {
            averagex = averagex + positionbyseconds[i].x;
            averagey = averagey + positionbyseconds[i].y;
            averagez = averagez + positionbyseconds[i].z;
        }
        //update positionbyminutess using an intermediary
        let positiontoadd = new positionvariable();
        positiontoadd.x = Math.round(averagex / 93);
        positiontoadd.y = Math.round(averagey / 93);
        positiontoadd.z = Math.round(averagez / 93);
        positiontoadd.time = inputposition.time;
        positiontoadd.event = eventtext;
        eventtext = "";
        positionbyminutes.push(positiontoadd);
        //Updated save and verify buttons to active
        if (document.getElementById("btnSavepositionbyminutes").disabled = true) {
            document.getElementById("btnSavepositionbyminutes").disabled = false;
        }
        //update verify buttons to be able to enter another event
        document.getElementById("btnVerifyHand").disabled = false;
        document.getElementById("btnVerifyHand").style.backgroundColor = "#0275d8";
        document.getElementById("btnVerifyFeet").disabled = false;
        document.getElementById("btnVerifyFeet").style.backgroundColor = "#0275d8";
    }
}

// Level Selected
function LevelSelected(selectLevel, selectRoom) {
    var selectLevel = document.getElementById(selectLevel);
    var selectRoom = document.getElementById(selectRoom);
    document.getElementById("labelLevel").innerHTML = "Level";
    document.getElementById("labelRoom").innerHTML = "Set Room";
    document.getElementById("labelRoom").disabled = "false";
    document.getElementById("labelLevel").style.backgroundColor = "#5cb85c";
    level = selectLevel.value;
    if (level == "6" || level == "7" || level == "8") {
        level = "0" + level;
    }
    selectRoom.innerHTML = "";
    var newOption = document.createElement("option");
    newOption.value = "Choose room";
    newOption.innerHTML = "Choose room";
    selectRoom.options.add(newOption);
    if (selectLevel.value == "6" || selectLevel.value == "7" || selectLevel.value == "8") {
        for (let i = 1; i < 25; i++) {
            var newOption = document.createElement("option");
            newOption.value = i;
            newOption.innerHTML = i;
            selectRoom.options.add(newOption);
        }
    }
    if (selectLevel.value == "11" || selectLevel.value == "12" || selectLevel.value == "13" || selectLevel.value == "14" || selectLevel.value == "15" || selectLevel.value == "16" || selectLevel.value == "17" || selectLevel.value == "18") {
        for (let i = 1; i < 37; i++) {
            var newOption = document.createElement("option");
            newOption.value = i;
            newOption.innerHTML = i;
            selectRoom.options.add(newOption);
        }
    }
}

// Room Selected
function RoomSelected(selectLevel, selectRoom) {
    var selectLevel = document.getElementById(selectLevel);
    var selectRoom = document.getElementById(selectRoom);
    document.getElementById("labelRoom").innerHTML = "Room";
    document.getElementById("btnConnect").disabled = false
    document.getElementById("labelRoom").style.backgroundColor = "#5cb85c";
    room = selectRoom.value;
    if (room == "1" || room == "2" || room == "3" || room == "4" || room == "5" || room == "6" || room == "7" || room == "8" || room == "9") {
        room = "0" + room;
    }
}

// THREE boilerplate
var scene, camera, renderer, cube;
var WIDTH = window.innerWidth * 0.1;
var HEIGHT = window.innerHeight * 0.1
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 1, 40);
    camera.position.set(0, -4, 8);
    camera.lookAt(scene.position);
    cube = new THREE.Mesh(new THREE.CubeGeometry(4, 2, 1), new THREE.MeshNormalMaterial());
    // scene.backgroundcolor("white")
    scene.add(cube);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0xffffff, 0); // white background - replace ffffff with any hex color
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);
}
function render() {
    cube.lookAt(accel);
    renderer.render(scene, camera);
}
init();
render();

//Charting
var pastminutectx = document.getElementById("chartpositionpastminute");
var chartpositionpastminute = new Chart(pastminutectx, {
    type: "line",
    data: {
        labels: positionpastminutetimevalues,
        datasets: [{
            label: "X",
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(0,0,255,1.0)",
            borderColor: "rgba(0,0,255,0.1)",
            data: positionpastminutexvalues,
        }, {
            label: "Y",
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(0,255,0,1.0)",
            borderColor: "rgba(0,255,0,0.1)",
            data: positionpastminuteyvalues,
        }, {
            label: "Z",
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(255,0,0,1.0)",
            borderColor: "rgba(255,0,0,0.1)",
            data: positionpastminutezvalues,
        }]
    },
    options: {
        title: "Position past minute",
        legend: { display: true },
        scales: {
            yAxes: [{
                ticks: { min: -10000, max: 10000 },
                position: "right"
            }],
            xAxes: [{
                ticks: { min: 0, max: 60, display: false },
                position: "center"
            }],
        }
    }
});
