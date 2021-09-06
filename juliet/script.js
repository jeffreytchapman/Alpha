// Populate select room
function PopulateSelectRoom(selectLevel, selectRoom) {
    var selectLevel = document.getElementById(selectLevel);
    var selectRoom = document.getElementById(selectRoom);
    selectRoom.innerHTML = "";
    if (selectLevel.value >= 6 && selectLevel <= 8) {
        for (let i = 1; i < 25; i++) {
            var newOption = document.createElement("option");
            newOption.value = i;
            newOption.innerHTML = i;
            selectRoom.options.add(newOption);
        }
    }
    if (selectLevel.value >= 11 && selectLevel <= 18) {
        for (let i = 1; i < 37; i++) {
            var newOption = document.createElement("option");
            newOption.value = i;
            newOption.innerHTML = i;
            selectRoom.options.add(newOption);
        }
    }
}