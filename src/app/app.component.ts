import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';

import { DatePipe } from '@angular/common';

import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Mobile Air Monitoring';
  dateMesB: any;
  dateMes: string;
  mymap: any;
  myIcon: any;
  polluant: String;
  nomStation: String;
  detailsHTML: any = 0;

  constructor(private httpService: HttpClient, private datePipe: DatePipe) { }
  sensorTab: string[];

  ngOnInit() {
    // Déclaration de la carte avec les coordonnées du centre et le niveau de zoom.
    this.mymap = L.map('map').setView([43.6311634, 1.43], 8);
    this.polluant = "O3"; //par defaut ozone pour l'instant   
    this.detailsHTML += 1;

    //recuperation des donnees JSON dans un tableau sensorTab
    this.httpService.get('./assets/convertcsv.json').subscribe( //Fichier local
    //this.httpService.get('https://opendata.arcgis.com/datasets/047b4d01a64943cb8a648aaf9b58307b_0.geojson').subscribe( //API Atmo
      data => {
        this.dateMesB = this.datePipe.transform(Date.now(), 'yyyy-MM-dd');
        this.dateMes = this.datePipe.transform(Date.now(), 'yyyy-MM-dd');
        //console.log(this.dateMes);
        this.sensorTab = data as string[];
        this.afficherCarte();
      },
      (err: HttpErrorResponse) => {
        console.log(err.message);
      }
    );      
  }

  afficherCarte () {
    let icon;
    let dateMes2 = this.dateMes;
    let mymap = this.mymap;
    let polluant = this.polluant;
    let tab = this.sensorTab;
    
    //tableaux contenant les differents niveaux de concentration de polluant du plus dangereux au moins dangereux
    var nivOzone = [180,120,50];
    var nivPm10 = [50,40,15];

    //reinitialisation de la carte
    mymap.eachLayer(function (layer) {
    mymap.removeLayer(layer);
    });
    
    //chargement de la carte
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: 'Map'
    }).addTo(this.mymap);

    //placement des markers a partir du tableau sensorTab
    this.sensorTab.forEach(function (value) {
    let nivTab : any;
      if (value["date_fin"].substring(0, 10) == dateMes2 && value["polluant"] == polluant) {
        //niveaux de concentration d'ozone
        if(polluant=="O3"){nivTab = nivOzone}else{nivTab=nivPm10};
        if(parseInt(value["valeur_originale"]) > nivTab[0]){icon="icon4"}else if(parseInt(value["valeur_originale"]) > nivTab[1]){icon="icon3"}else if(parseInt(value["valeur_originale"]) > nivTab[2]){icon="icon2"}else{icon="icon1"};
        //definition du texte à afficher
        let html = "<b>"+value["polluant"]+"</b></br>"+value["nom_station"]+"</br>"+value["valeur_originale"]+value["code_unite_concentration"];
        //ajout du marqueur
        L.marker([value["Y"], value["X"]], {icon: L.icon({iconUrl: 'assets/'+icon+'-sm.png'}), title: value["nom_station"]}).bindPopup(html).addTo(mymap).on('click',details);    
      };
    })

  //affichage des details lors du clique sur un marqueur (code Javascript)
  function details(e){
    //affichage du tableau des données pour un capteur précis
    var el = document.getElementById("tableau");
    var el2 = document.getElementById("nomStation");
    el.innerHTML="";
    //el.DataTable();
    var dps = [];
    var dpsPm10 = [];

    el2.innerHTML=e.sourceTarget.options.title;
    var table="<table class=\"table-reponsive-md\"><tr><th>Pollutant</th><th>Value</th><th>date</th><th>time</th></tr>";
        for(var i=0;i<tab.length;i++)
    {
      if(tab[i]["nom_station"]==e.sourceTarget.options.title){
      table+="<tr><td>"+tab[i]["polluant"]+"</td><td>"+tab[i]["valeur_originale"]+" "+tab[i]["code_unite_concentration"]+"</td><td>"+tab[i]["date_fin"].substring(0, 10)+"</td><td>"+tab[i]["date_fin"].substring(11, 16)+"</td><td>"+"</td></tr></table>";
      //données de concentration en ozone
      if(tab[i]["polluant"]=="O3"){
      dps.push({
        x: Date.parse(tab[i]["date_fin"].substring(0, 10)),
        y: parseFloat(tab[i]["valeur_originale"])
      })
    }
    if(tab[i]["polluant"]=="PM10"){
      dpsPm10.push({
        x: Date.parse(tab[i]["date_fin"].substring(0, 10)),
        y: parseFloat(tab[i]["valeur_originale"])
      })
    }
    }
    }
    el.innerHTML+=table+"</table>";

    function compareDataPointX(dataPoint1, dataPoint2) {
      return dataPoint1.x - dataPoint2.x;
    }

    //génération d'un graphique de données
    var chart = new CanvasJS.Chart("chartContainer", { //ignorez l'erreur, c'est juste qu'on inclut du JS dans du TS
      animationEnabled: true,
      title: {
        text: "Pollutant concentration"
      },
      theme: "light1",
      axisX: {
        title: "Time"
      },
      axisY: {
        title: "Taux",
        suffix: "µg/m-3"
      },
      data: [{
        type: "line",
        name: "Concentration en ozone",
        connectNullData: true,
        //nullDataLineDashType: "solid",
        xValueType: "dateTime",
        xValueFormatString: "DD MMM hh:mm TT",
        yValueFormatString: "#,##0.##\"ug.m-3\"",
        dataPoints: dps
      },
      {
        type: "line",
        color: "red",
        name: "Concentration en PM10",
        connectNullData: true,
        xValueType: "dateTime",
        xValueFormatString: "DD MMM hh:mm TT",
        yValueFormatString: "#,##0.##\"ug.m-3\"",
        dataPoints: dpsPm10
      }]
    });
    chart.options.data[0].dataPoints.sort(compareDataPointX);//order by asc date
    chart.options.data[1].dataPoints.sort(compareDataPointX);//order by asc date
    chart.render();
  }
  }

  //Mise a jour de la date par rapport a la selection
  onDateChanged(): void {
    this.dateMes = this.datePipe.transform(this.dateMesB, 'yyyy-MM-dd');
    this.afficherCarte();
  }

  //Mise a jour du polluant par rapport a la selection
  //Ai fait 2 fonctions pour les phases de test mais peut (doit?) etre reduit
  ozone(){
    this.polluant="O3";
    this.afficherCarte();
  }

  pm10(){
    this.polluant="PM10";
    this.afficherCarte();
  }  
}
