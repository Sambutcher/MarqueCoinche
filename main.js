const selectDonneur=document.getElementById("donneur");
const selectAnnonce = document.getElementById("annonce");
const radioNoncoinche = document.getElementById("noncoinche");
const radioCoinche = document.getElementById("coinche");
const radioSurcoinche = document.getElementById("surcoinche");
const buttonValidNous = document.getElementById("validNous");
const buttonValidEux = document.getElementById("validEux");
const buttonFaite = document.getElementById("faite");
const buttonChutee = document.getElementById("chutee");
const boxEtoile = document.getElementById("etoile");
const textScoreNous = document.getElementById("scoreNous");
const textScoreEux = document.getElementById("scoreEux");

let status=0; //0:annonce, 1:score
let preneur;
let contrat;
let coinche;
let scoreNous=0;
let scoreEux=0;
let etoilesNous=0;
let etoilesEux=0;

function nextStatus(){
	if (status==0){
		selectDonneur.disabled=true;
		selectAnnonce.disabled=true;
		radioNoncoinche.disabled=true;
		radioCoinche.disabled=true;
		radioSurcoinche.disabled=true;
		buttonValidNous.disabled=true;
		buttonValidEux.disabled=true;
		buttonFaite.disabled=false;
		buttonChutee.disabled=false;
		boxEtoile.disabled=false;

		status=1;
	} else {
		selectDonneur.disabled=false;
		selectDonneur.valueAsNumber=(selectDonneur.valueAsNumber+1)%4; 
		console.log(selectDonneur.value);
		selectAnnonce.disabled=false;
		selectAnnonce.value="";
		radioNoncoinche.disabled=false;
		radioNoncoinche.checked=true;
		radioCoinche.disabled=false;
		radioSurcoinche.disabled=false;
		buttonValidNous.disabled=false;
		buttonValidNous.hidden=false;
		buttonValidEux.disabled=false;
		buttonValidEux.hidden=false;
		buttonFaite.disabled=true;
		buttonChutee.disabled=true;
		boxEtoile.disabled=true;
		boxEtoile.checked=false;

		status=0;
}}

buttonValidNous.onclick = () => {
	if (selectAnnonce.value!=""){
		nextStatus();
		buttonValidEux.hidden=true;
		preneur="Nous";
		if (selectAnnonce.value=="Capot"){
			contrat=250;
		} else if (selectAnnonce.value=="Générale"){
			contrat=500;
		} else {
			contrat=selectAnnonce.value;
		}
		coinche=1*radioNoncoinche.checked+2*radioCoinche.checked+4*radioSurcoinche.checked;
	}
}

buttonValidEux.onclick = () => {
	if (selectAnnonce.value!=""){
		nextStatus();
		preneur="Eux";
		buttonValidNous.hidden=true;
		if (selectAnnonce.value=="Capot"){
			contrat=250;
		} else if (selectAnnonce.value=="Générale"){
			contrat=500;
		} else {
			contrat=selectAnnonce.value;
		}
		coinche=1*radioNoncoinche.checked+2*radioCoinche.checked+4*radioSurcoinche.checked;
	}
}

buttonFaite.onclick = () => {
	if (preneur=="Nous"){
		scoreNous+=contrat*coinche;
		boxEtoile.checked ? etoilesNous++ : null;
	} else {
		scoreEux+=contrat*coinche;
		boxEtoile.checked ? etoilesEux++ : null;
	}
	textScoreNous.innerHTML=scoreNous+"*".repeat(etoilesNous);
	textScoreEux.innerHTML=scoreEux+"*".repeat(etoilesEux);
	nextStatus();
}

buttonChutee.onclick = () => {
	if (preneur=="Nous"){
		scoreEux+=160*coinche;
		boxEtoile.checked ? etoilesEux++ : null;
	} else {
		scoreNous+=160*coinche;
		boxEtoile.checked ? etoilesNous++ : null;
	}
	textScoreNous.innerHTML=scoreNous+"*".repeat(etoilesNous);
	textScoreEux.innerHTML=scoreEux+"*".repeat(etoilesEux);
	nextStatus();

}
