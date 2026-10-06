let response;
let presets;
let substitutionPairs;
let substitutionName = "Spire Script";
let tableSubmitted = false;
fetchPresets();
const squeak = new Audio("assets/speak.mp3");

document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById("frm1").addEventListener("submit", function(e) {
        e.preventDefault(); // Cancel the default action
        processTranscriptSubmit();
    });
    let octopus = document.getElementById("octo");
    octopus.addEventListener("click", function(e) {
        octopus.src="assets/octo-frames/octo2.png";
        playSqueak();
        setTimeout(() => { octopus.src="assets/octo-frames/octo1.png"; }, 250);
    });

    document.getElementById('cScriptTable').addEventListener("input", function(e){
        tableSubmitted = false;
    });

    let presetButtons = document.querySelectorAll("#PresetContainer button");
    for(button in presetButtons){
        presetButtons[button].onclick = function(){
            setPreset(this.id);
            presetButtons.forEach(function(btn){
                btn.classList.remove('selected');
            })
            this.classList.add('selected');
        }
    }
});

async function fetchPresets(){
    response = await fetch("./assets/ScriptPresets.json");
    presets = await response.json();
    substitutionPairs = presets.Spire.substitutions; //spire is default preset
}

function setPreset(presetName){ //make it so when the buttons are pressed it changes the preset
    let customContainer = document.getElementById('CustomScriptContainer');
    customContainer.style.display = "none";
    switch (presetName) {
        case "Spire":
            substitutionPairs = presets.Spire.substitutions;
            break;
        case "Lobby":
            substitutionPairs = presets.Lobby.substitutions;
            break;
        case "Swerve": //previously "Regular Swerve Script"
            substitutionPairs = presets.Swerve.substitutions;
            break;
        case "Hook": //previously oval swerve script
            substitutionPairs = presets.Hook.substitutions;
            break;
        case "Gothic":
            substitutionPairs = presets.Gothic.substitutions;
            break;
        case "Geometric":
            substitutionPairs = presets.Geometric.substitutions;
            break;
        case "ScriptB": //"Script B/ Squiggle script from erika's findings"
            substitutionPairs = presets.ScriptB.substitutions;
            break;
        case "Custom": //CUSTOM CELLS AND SHORTHAND
            customContainer.style.display="block";
            substitutionPairs = [];
            break;
        default:
            break;
    }
    substitutionName = `${presetName} Script`;
}

function processTranscriptSubmit(){
    let userTranscript = document.getElementsByName('userInput')[0].value;
    let output = convertToSlotter(userTranscript);
    let copyButton = document.getElementById("copyButton");
    let customInfo = document.getElementById("customMessage");
    customInfo.style.display="none";
    copyButton.value="Copy text";
    if(substitutionName == "Custom Script"){
        customInfo.innerHTML=tableSubmitted ? " (using table data)": " (not using table data)";
        customInfo.style.display="inline";
    }
    document.getElementById('result-p').innerHTML=output;
    document.getElementById('result').style.visibility='visible';
}

function sanitizeInput(unsanitized){ //this removed quotes wrapping entire input AND excess spacing on edges
    unsanitized = unsanitized.trim()
    let forbiddenQuotes = ['“','"',"”"];
    while(forbiddenQuotes.includes(unsanitized[0]) && forbiddenQuotes.includes(unsanitized.slice(-1))){
        unsanitized = unsanitized.slice(1,-1);
    }
    return unsanitized.trim();
}

function convertToSlotter(transcript){
    transcript=sanitizeInput(transcript);
    let result="";
    let resultParts=[];
    let group="";

    function sendGroup(){
        if(group.length>0){
            resultParts.push(`"${group}"`);
            group= "";
        }
    }

    for(let n=0; n<transcript.length;n++){
        let curr = transcript[n];
        let currIncluded = false;
        let currPairID = -1;

        for(let x=0; x<substitutionPairs.length;x++){
            if(substitutionPairs[x].shorthand == curr){
                currIncluded = true;
                currPairID = substitutionPairs[x].id;
            }
        }
        if (currIncluded){ //if current letter is shorthand
            sendGroup();
            resultParts.push(substitutionPairs[currPairID].cell);
        }
        else if(curr.charCodeAt(0) == 10){ //char codes of line breaks
            sendGroup();
            resultParts.push("CHAR(10)");
        }
        else if(curr.charCodeAt(0) == 13){ //char codes of line breaks
            sendGroup();
            resultParts.push("CHAR(13)");
        }
        /*else if(curr.charCodeAt(0) == 32){ //char code of space but its kinda unneeded
            sendGroup();
            resultParts.push("CHAR(32)");
        }*/
        else{
            if(curr=='"'){ //if its a quote add an extra quote to the group to make it a double quote. backslashes dont work in spreadsheets....
                group+="\"";
            }
            else if(curr=="_"){
                curr="□"; //if we put an underscore in the shorthand text, that means we probably can't read the actual letter. to stop it being confused with un-substituted shorthand, we're gonna make it this square symbol :]
            }
            group+=curr; //idek if this is gonna work bc stray letters will have to be surrounded by quotes
        }
    }
    sendGroup();
    result = `=(${resultParts.join('&')})`;
    return(result);
}

function addColumn(){
    let table = document.getElementById('cScriptTable');
    let newCell;
    let colCount = table.rows[0].cells.length;

    newCell = table.rows[0].insertCell(colCount);
    newCell.contentEditable="true";
    newCell.classList="shorthandSub sub"

    newCell = table.rows[1].insertCell(colCount);
    newCell.contentEditable="true";
    newCell.classList="cellSub sub"

    newCell = table.rows[2].insertCell(colCount);
    newCell.innerHTML="<button class='deleteBtn optBtn' onclick='handleDel(this)'><img src='assets/deleteIcon.png'></button><button class='resetBtn optBtn' onclick='handleReset(this)'><img src='assets/resetIcon.png'></button>";
    newCell.classList="cellOpt";
}

function handleDel(e){
    let table = document.getElementById('cScriptTable');
    let targetColIndex = e.parentElement.cellIndex;
    for(let r=0;r<3;r++){
        table.rows[r].deleteCell(targetColIndex);
    }
    tableSubmitted = false;
}

function handleReset(e){
    let table = document.getElementById('cScriptTable');
    let targetColIndex = e.parentElement.cellIndex;
    for(let r=0;r<2;r++){
        table.rows[r].children[targetColIndex].innerHTML = "";
    }
    tableSubmitted = false;
}

function processSubDataSubmit(){
    let table = document.getElementById('cScriptTable');
    let errorMessage = document.getElementById('submissionError');
    
    let tbToArrData = tableToArray(table);

    if((tbToArrData.submissionData).length>0){
        if(tbToArrData.missingCells){
            errorMessage.innerHTML="WARNING: Columns with cells lacking data were not included in the submission";
            errorMessage.style.display = "block";
        }
        else{
            errorMessage.style.display = "none";
        }
        substitutionPairs=tbToArrData.submissionData;
        tableSubmitted = true;
    }
    else{
        errorMessage.innerHTML="Submission failed - table incomplete";
        errorMessage.style.display = "block";
    }
}

function copyText(){ //shoutout w3 schools https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
    let textToCopy = document.getElementById("result-p");
    let copyButton = document.getElementById("copyButton");
    textToCopy.select();
    textToCopy.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(textToCopy.value);
    copyButton.value="Copied!";
}

function playSqueak(){
    squeak.currentTime=0;
    squeak.volume=0.5;
    squeak.play();
}

function tableToArray(table){
    let colCount = table.rows[0].cells.length;
    let shorthandContent;
    let cellContent;
    let newSubstitutionData = [];
    let missingCells = false;
    for(c=1;c<colCount;c++){
        shorthandContent = table.rows[0].children[c].innerHTML;
        cellContent = table.rows[1].children[c].innerHTML;
        if(shorthandContent != "" && cellContent != ""){
            newSubstitutionData.push({id:newSubstitutionData.length, shorthand:shorthandContent, cell:cellContent});
        }
        else{
            missingCells = true;
        }
    }
    let output = {submissionData:newSubstitutionData,missingCells:missingCells}
    return output;
}

/*function jsonToTable(jason){
    try {
        let tableData = jason.substitutions;
        let table = "<table id='cScriptTable'><tr><th>Shorthand</th></tr><tr><th>Cell</th></tr><tr class='optionsRow'><th>Options</th></tr></table>";


    } catch (error) {
        throw new Error(error);
    }
}

function tableToJson(table){

}*/