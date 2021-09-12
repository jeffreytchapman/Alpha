// Variables
var room;
var level;
var acceltimer;
var flashtimer;
var batterychecktimer;
var savepositionbyminutestimer;
var accel = new THREE.Vector3(0, 0, 1);
var anglechange = "0";
const date = new Date();
var lastsignificantpositionchangetime = date.getTime();
function positionvariable(x, y, z, time) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.time = time;
}
const previousposition = new positionvariable(0, 0, 8000, date.getTime());
const currentposition = new positionvariable(0, 0, 0, 0);
const position = new positionvariable(0, 0, 0, 0);
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
positionbyminutes[0] = { x: 0, y: 0, z: 8000, time: date.getTime() };

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
        document.getElementById("btnConnect").disabled=true;
        document.getElementById("btnDisconnect").disabled = false;
        //acceltimer = setInterval(accelcollect, 650);
        //flashtimer = setInterval(flasher, 650);
        //batterychecktimer = setInterval(batterycheck, 1000 * 60 * 10);
        //savepositionbyminutestimer = setInterval(savepositionbyminutesclick, 1000 * 60 * 60);
        //batterycheck();
        //Set times
        //Puck.setTime();
        const connectclickdate = new Date();
        previousposition.time = connectclickdate.getTime();

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
    if (d.length == 4 && d[0] == "A") {
        // we have an accelerometer reading
        var accelbar = {
            x: parseInt(d[1]) * 100 / 8192,
            y: parseInt(d[2]) * 100 / 8192,
            z: parseInt(d[3]) * 100 / 8192,
        };
        // Update bar positions
        setBarPos("barX", accelbar.x);
        setBarPos("barY", accelbar.y);
        setBarPos("barZ", accelbar.z);
        // From old accelcollect
        const accelcollectdate = new Date();
        //Get accel data
        accel.x = parseInt(d[1]);
        currentposition.x = accel.x;
        accel.y = parseInt(d[2]);
        currentposition.y = accel.y;
        accel.z = parseInt(d[3]);
        currentposition.z = accel.z;
        currentposition.time = accelcollectdate.getTime();
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

        //Get angle change removed from observing protocol
        /*anglechange = 57.2958 * Math.acos((previousposition.x * currentposition.x + previousposition.y * currentposition.y + previousposition.z * currentposition.z) / (Math.sqrt(Math.pow(previousposition.x, 2) + Math.pow(previousposition.y, 2) + Math.pow(previousposition.z, 2)) * Math.sqrt(Math.pow(currentposition.x, 2) + Math.pow(currentposition.y, 2) + Math.pow(currentposition.z, 2))));
        document.getElementById("anglechange").value = Math.round(anglechange);
        //If angle change is significant reset previous position and time
        if (anglechange > 20) {
            previousposition.x = currentposition.x;
            previousposition.y = currentposition.y;
            previousposition.z = currentposition.z;
            previousposition.time = currentposition.time;
            lastsignificantpositionchangetime = currentposition.time
        }
        document.getElementById("positionduration").value = Math.trunc((currentposition.time - lastsignificantpositionchangetime) / (1000 * 60)) + " min";
        */

        //go to updateminute data function with every new accel position
        updateminutedata(currentposition);



    }
}
// Set the position of each bar
function setBarPos(id, d) {
    var s = document.getElementById(id).style;
    if (d > 150) d = 150;
    if (d < -150) d = -150;
    if (d >= 0) {
        s.left = "150px";
        s.width = d + "px";
    } else { // less than 0
        s.left = (150 + d) + "px";
        s.width = (-d) + "px";
    }
}

// When we click the connect button...
function XXXconnectclick() {
    document.getElementById("btnConnect").disabled = true;
    document.getElementById("btnDisconnect").disabled = false;
    Puck.write('Puck.accelOn(1.6);\n');
    Puck.write('NRF.setTxPower(4);\n');
    acceltimer = setInterval(accelcollect, 650);
    flashtimer = setInterval(flasher, 650);
    batterychecktimer = setInterval(batterycheck, 1000 * 60 * 10);
    savepositionbyminutestimer = setInterval(savepositionbyminutesclick, 1000 * 60 * 60);
    batterycheck();
    //Set times
    Puck.setTime();
    const connectclickdate = new Date();
    previousposition.time = connectclickdate.getTime();
}

// Flash green when we collect accel data...
function flasher() {
    Puck.write('digitalPulse(LED2, 1, 200);\n');
}

// Collect battery level based on a timer...
async function batterycheck() {
    let myPromise = new Promise(function (myResolve, myReject) {
        myResolve(Puck.eval("E.getBattery()"));
    });
    document.getElementById("batterylevel").value = await myPromise;
}

// When we click the disconnect button...
function disconnectclick() {
    Puck.write('Puck.accelOff();\n');
    clearInterval(flashtimer);
    clearInterval(acceltimer);
    document.getElementById("btnConnect").disabled = false;
    document.getElementById("btnDisconnect").disabled = true;
    Puck.write('reset();\n');
}

// When we click the savepositionbymimutesbutton button...
function savepositionbyminutesclick() {
    //create an array from the data
    const csvstring = [
        [
            "X",
            "Y",
            "Z",
            "Time"
        ],
        ...positionbyminutes.map(item => [
            item.x,
            item.y,
            item.z,
            item.time
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

// Collect accel data
function accelcollect() {
    Puck.eval("Puck.accel()", function (x) {
        const accelcollectdate = new Date();
        //Get accel data
        accel.x = x.acc.x;
        currentposition.x = accel.x;
        accel.y = x.acc.y;
        currentposition.y = accel.y;
        accel.z = x.acc.z;
        currentposition.z = accel.z;
        currentposition.time = accelcollectdate.getTime();
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

        //Get angle change removed from observing protocol
        /*anglechange = 57.2958 * Math.acos((previousposition.x * currentposition.x + previousposition.y * currentposition.y + previousposition.z * currentposition.z) / (Math.sqrt(Math.pow(previousposition.x, 2) + Math.pow(previousposition.y, 2) + Math.pow(previousposition.z, 2)) * Math.sqrt(Math.pow(currentposition.x, 2) + Math.pow(currentposition.y, 2) + Math.pow(currentposition.z, 2))));
        document.getElementById("anglechange").value = Math.round(anglechange);
        //If angle change is significant reset previous position and time
        if (anglechange > 20) {
            previousposition.x = currentposition.x;
            previousposition.y = currentposition.y;
            previousposition.z = currentposition.z;
            previousposition.time = currentposition.time;
            lastsignificantpositionchangetime = currentposition.time
        }
        document.getElementById("positionduration").value = Math.trunc((currentposition.time - lastsignificantpositionchangetime) / (1000 * 60)) + " min";
        */

        //go to updateminute data function with every new accel position
        updateminutedata(currentposition);
    })
}

function updateminutedata(inputposition) {
    //console.log(Math.trunc((inputposition.time-positionbyminutes[(positionbyminutes.length-1)].time)/1000));    
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
        positionbyminutes.push(positiontoadd);
        if (document.getElementById("btnSavepositionbyminutes").disabled = true) {
            document.getElementById("btnSavepositionbyminutes").disabled = false;
        }
        //items below work
        // console.log("after 60 sec update positionbyminutes[last].time=" + positionbyminutes[(positionbyminutes.length - 1)].time);
        //console.log("after 60 sec update positionbyminutes[last].x="+positionbyminutes[(positionbyminutes.length-1)].x);
        //console.log("after 60 sec update positionbyminutes[last].y="+positionbyminutes[(positionbyminutes.length-1)].y);
        //console.log("after 60 sec update positionbyminutes[last].z="+positionbyminutes[(positionbyminutes.length-1)].z);
        //Puck.eval("NRF.getBattery()",function(w) { console.log("battery=" + w); });
    }
}

// Level Selected
function LevelSelected(selectLevel, selectRoom) {
    var selectLevel = document.getElementById(selectLevel);
    var selectRoom = document.getElementById(selectRoom);
    document.getElementById("labelLevel").innerHTML = "Level";
    document.getElementById("labelRoom").innerHTML = "Set Room";
    document.getElementById("labelRoom").disabled = "false";
    //document.getElementById("labelLevel").style.backgroundColor = "chartreuse";
    //document.getElementById("labelLevel").style.color = "chartreuse";
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
    //document.getElementById("labelLevel").style.backgroundColor = "chartreuse";
    //document.getElementById("labelLevel").style.color.replace = "chartreuse";
    room = selectRoom.value;
    if (room == "1" || room == "2" || room == "3" || room == "4" || room == "5" || room == "6" || room == "7" || room == "8" || room == "9") {
        room = "0" + room;
    }
}

// THREE boilerplate
var scene, camera, renderer, cube;
var WIDTH = window.innerWidth * 0.4;
var HEIGHT = window.innerHeight * 0.4;
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
