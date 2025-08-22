const width = 850; // fills out the box of the svg well
const height = 650; // London projection on a map is about 1.3 times wider than its height

// Borough Statistics Display Panels
const boroughCrimeRatesByType = document.createElement("div");
boroughCrimeRatesByType.id = "borough-crime-rates";
boroughCrimeRatesByType.style.position = "fixed";
boroughCrimeRatesByType.style.top = "0";
boroughCrimeRatesByType.style.left = "0";
boroughCrimeRatesByType.style.width = "475px";
boroughCrimeRatesByType.style.height = "100%";
boroughCrimeRatesByType.style.backgroundColor = "#f8f9fa";
boroughCrimeRatesByType.style.padding = "20px";
boroughCrimeRatesByType.style.zIndex = "9999";
boroughCrimeRatesByType.style.overflowY = "auto";
boroughCrimeRatesByType.style.boxSizing = "border-box";
boroughCrimeRatesByType.style.display = "none";
const boroughIndicators = boroughCrimeRatesByType.cloneNode(true);
boroughIndicators.id = "borough-indicators";
boroughIndicators.style.right = "0";
boroughIndicators.style.left = "auto";

const boroughHeader = document.createElement("h2");
boroughHeader.style.marginTop = "0";
boroughHeader.style.marginBottom = "20px";
boroughHeader.style.fontSize = "22px";
boroughHeader.textContent = "";
boroughHeader.style.textAlign = "center";
boroughHeader.style.fontWeight = "bold";
const boroughCrimeStatsHeader = boroughHeader.cloneNode(true);
const boroughIndicatorsHeader = boroughHeader.cloneNode(true);
boroughCrimeRatesByType.appendChild(boroughCrimeStatsHeader);
boroughIndicators.appendChild(boroughIndicatorsHeader);

const boroughText = document.createElement("div");
boroughText.style.marginTop = "20px";
const boroughCrimeStatsText = boroughText.cloneNode(true);
const boroughIndicatorsText = boroughText.cloneNode(true);
boroughCrimeRatesByType.appendChild(boroughCrimeStatsText);
boroughIndicators.appendChild(boroughIndicatorsText);

const closeDisplay = document.createElement("button");
closeDisplay.id = "close-panel";
closeDisplay.style.position = "absolute";
closeDisplay.style.top = "10px";
closeDisplay.style.right = "10px";
closeDisplay.style.background = "none";
closeDisplay.style.border = "none";
closeDisplay.style.fontSize = "24px";
closeDisplay.style.cursor = "pointer";
closeDisplay.textContent = "×";
closeDisplay.addEventListener("click", hideStatsPanel);
boroughIndicators.appendChild(closeDisplay);

document.body.appendChild(boroughCrimeRatesByType);
document.body.appendChild(boroughIndicators);

// Visuals for tooltips and map display
const svg = d3.select("svg").attr("viewBox", [0, 0, width, height]);
const tooltip = d3.select(".tooltip");
const mapColorScale = d3.scaleQuantile().range(
  ["#fee5d9", "#fcbba1", "#fc9272", "#ef3b2c", "#99000d"]
);

// Load crime rates from the Crime and Population data files, for all years 2015-2024 and boroughs.
const yearLabel = document.getElementById("year-label");
const slider = document.getElementById("year-slider");
const crimeDataPrefix = "crime_data/other_crime_data_"
const populationDataPrefix = "population_data/population_data_"
const dataSuffix = ".csv";
let currentBorough;
let crimeRatesByBoroughByYear = {};
let crimeSubtypeRatesByBoroughByYear = {};
let populationDataByBoroughByYear = {};
const dataLoadedPromises = [];
for (let i = 0; i < 10; ++i) {
  const currentYear = 2015 + i;
  const dataLoadedPromise = getCrimeRateData(currentYear).then((
    {crimeRatesByBorough, crimeSubtypeRatesByBorough, cleanedPopulationDataByBorough}
  ) => {
    crimeRatesByBoroughByYear[currentYear] = crimeRatesByBorough;
    crimeSubtypeRatesByBoroughByYear[currentYear] = crimeSubtypeRatesByBorough;
    populationDataByBoroughByYear[currentYear] = cleanedPopulationDataByBorough;
  });
  dataLoadedPromises.push(dataLoadedPromise);
}
// Ensure the slider is set to the default year, 2024, and update the map display accordingly
// Must be performed after loading datasets.
Promise.all(dataLoadedPromises).then(() => {
  slider.value = 2024;
  yearLabel.textContent = slider.value;
  updateMapDisplay(slider.value);
});

// Slider for year selection and to update displayed stats after
slider.addEventListener("input", () => {
    const selectedYear = slider.value;
    yearLabel.textContent = selectedYear;
    updateMapDisplay(selectedYear);
    if (currentBorough) {
      updateBoroughStatsPanel(currentBorough, selectedYear);
    }
});

// Load map of London from GeoJSON and legend for crime rates
const projection = d3.geoMercator().center([-0.1, 51.5]).scale(50000).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);
let boroughPaths;
let geojsonValue;
let dataLegend;
let dataLegendItems;
let dataLegendTexts;
d3.json("LondonBoroughs.geojson").then(geojson => {
  geojsonValue = geojson;
  boroughPaths = svg.selectAll("path")
    .data(geojson.features).enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .on("mouseout", function () {
      tooltip.style("display", "none");
    })
    .on("click", function(event, d) {
      const boroughName = d.properties.neighbourhood;
      if (boroughName == "City of London") {
        // Crime Data does not record for the City of London area, so the stats cannot be displayed.
        return;
      }
      currentBorough = boroughName;
      updateBoroughStatsPanel(boroughName, yearLabel.textContent);
    });  
  dataLegend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(20, 20)`);
  dataLegend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("font-weight", "bold")
    .text("Crime Rate (per 1,000 people)");
  dataLegendItems = dataLegend.selectAll(".legend-item")
    .data(mapColorScale.range())
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20 + 20})`);
  dataLegendItems.append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", d => d);
  dataLegendTexts = dataLegendItems.append("text")
    .attr("x", 20)
    .attr("y", 12)
    .text("");
  getCrimeRateData(slider.value);
});

// Load socioeconomic data from files, for all years 2015-2024.
const socioeconomicDir = "socioeconomic_data/";
const socioeconomicFilePaths = [
  "average_attainment_8_score_GCSE",
  "average_weekly_pay",
  "house_price_to_earnings",
  "unemployment",
  "households_on_LA_wait_list",
  "total_families_receiving_child_benefits",
]
.map(fileName => socioeconomicDir + fileName + "_data_2015-2024" + dataSuffix);
let socioeconomicDatasets = [];
Promise.all(socioeconomicFilePaths.map(file => d3.csv(file))).then(datasets => {
  socioeconomicDatasets = datasets;
})

function showStatsPanel() {
  boroughCrimeRatesByType.style.display = "block";
  boroughIndicators.style.display = "block";
}

function hideStatsPanel() {
  boroughCrimeRatesByType.style.display = "none";
  boroughIndicators.style.display = "none";
  currentBorough = null;
}

// Get the rank of any item in a list it's an element of.
function getRankInList(item, list) {
  const index = list.indexOf(item);
  const position = index + 1;
  let rank = "";
  last2Digits = position % 100;
  if (last2Digits == 11 || last2Digits == 12 || last2Digits == 13) {
    rank = "th";
  } else {
    switch (position % 10) {
      case 1:
        rank = "st";
        break;
      case 2:
        rank = "nd";
        break;
      case 3:
        rank = "rd";
        break;
      default:
        rank = "th";
        break;
    }
  }
  return `(${position}${rank})`;
}

// Update borough statistics panel with a given borough and year.
// Display relevant, interesting ranked data about crime and socioeconomic indicators.
function updateBoroughStatsPanel(boroughName, selectedYear) {
  const crimeRatesByBorough = crimeRatesByBoroughByYear[selectedYear];
  const crimeRateInThisBorough = crimeRatesByBorough[boroughName];
  const rankedCrimeRates = Object.values(crimeRatesByBorough).sort(d3.descending);

  const crimeSubtypeRatesByBorough = crimeSubtypeRatesByBoroughByYear[selectedYear];
  const crimeSubtypeRateInThisBorough = crimeSubtypeRatesByBorough[boroughName];
  const crimeSubTypeRankings = {};
  Object.values(crimeSubtypeRatesByBorough).map(entry => {
    Object.entries(entry).forEach(([crimeSubtype, crimeSubtypeRate]) => {
      if (!crimeSubTypeRankings[crimeSubtype]) {
        crimeSubTypeRankings[crimeSubtype] = [];
      }
      crimeSubTypeRankings[crimeSubtype].push(crimeSubtypeRate);
    })
  });
  Object.entries(crimeSubTypeRankings).forEach(([crimeSubtype, crimeSubtypeRate]) => {
    crimeSubTypeRankings[crimeSubtype] = crimeSubtypeRate.sort(d3.descending);
  });

  const populationDataByBorough = populationDataByBoroughByYear[selectedYear];
  const rankedPopulations = Object.values(populationDataByBorough).map(entry => 
    parseInt(entry["GLA Population estimate/ projection"].replace(/,/g, ""), 10))
    .sort(d3.descending);

  boroughCrimeStatsHeader.textContent = `${boroughName}, ${selectedYear}`;
  boroughIndicatorsHeader.textContent = `${boroughName}, ${selectedYear}`;
  
  // Crime Statistics
  boroughCrimeStatsText.textContent = "";
  boroughCrimeStatsText.innerHTML = `<strong>Crime Rate:</strong> ${crimeRateInThisBorough.toFixed(2)} 
                                     per 1,000 people ${getRankInList(crimeRateInThisBorough,
                                                                       rankedCrimeRates)} <br>`;
  Object.entries(crimeSubtypeRateInThisBorough).sort((a, b) => a[0].localeCompare(b[0]))
                                                         .forEach(([crimeType, boroughSubtypeCrimeRate]) => {
    const crimeTypeData = document.createElement("crime-type-data");
    crimeTypeData.innerHTML = `<strong> • ${crimeType}</strong>: ${boroughSubtypeCrimeRate.toFixed(2)} 
                              ${getRankInList(boroughSubtypeCrimeRate, crimeSubTypeRankings[crimeType])} <br>`;
    crimeTypeData.style.fontSize = "12px";
    boroughCrimeStatsText.appendChild(crimeTypeData);
  });
  const crimeStatAcknowledgement = document.createElement("crime-type-source");
  crimeStatAcknowledgement.style.fontSize = "11px";
  crimeStatAcknowledgement.innerHTML = `Sources: London Data Store (MPS Monthly Crime Dashboard Data -
                                        Other Crime Data). <br>
                                        Note: Some crimes, e.g. Knife Crime are not recorded as a separate
                                        category beyond 2020.`;
  boroughCrimeStatsText.appendChild(crimeStatAcknowledgement);

  // Socio-Economic Indicators
  boroughIndicatorsText.textContent = "";
  const boroughPopulationData = populationDataByBorough.filter(entry => entry["Area name"] == boroughName)[0];
  const boroughPopulation = parseInt(boroughPopulationData["GLA Population estimate/ projection"].replace(/,/g, ""), 10);
  boroughIndicatorsText.innerHTML = `<strong>Population:</strong> ${boroughPopulation} 
                                     ${getRankInList(boroughPopulation, rankedPopulations)}<br>`;
  let index = 0;
  for (const dataset of socioeconomicDatasets) {
    // Clean socio-economic data down to only the boroughs in the crime data.
    const cleanedDataset = [];
    Object.keys(crimeRatesByBorough).forEach(borough => {
      const entry = dataset.filter(entry => entry["Area name"] == borough)[0];
      if (entry) {
        cleanedDataset.push(entry);
      }
    });
    const rankedCleanedDataset = cleanedDataset.map(entry => parseFloat(entry[selectedYear].replace(/,/g, "")))
                                               .sort(d3.descending);
    const boroughRelevantData = cleanedDataset.filter(entry => entry["Area name"] == boroughName)[0];
    const boroughYearRelevantData = parseFloat(boroughRelevantData[selectedYear].replace(/,/g, ""));
    const boroughYearRelevantDataRank = getRankInList(boroughYearRelevantData, rankedCleanedDataset);
    const socioeconomicData = document.createElement("socioeconomic-data");
    let socioeconomicHTML = "";
    switch (index) {
      case 0:
        socioeconomicHTML = `<strong>Average Attainment 8 Score at GCSE:</strong> ${boroughYearRelevantData.toFixed(1)}`;
        break;
      case 1:
        socioeconomicHTML = `<strong>Average Weekly Pay:</strong> £${boroughYearRelevantData.toFixed(2)}`;
        break;
      case 2:
        socioeconomicHTML= `<strong>House Price to Earnings Ratio:</strong> ${boroughYearRelevantData.toFixed(2)}`;
        break;
      case 3:
        socioeconomicHTML = `<strong>Unemployment Rate:</strong> ${boroughYearRelevantData.toFixed(1)}%`;
        break;
      // Data for households needs to be normalised to per 1000 people, as boroughs have different populations.
      case 4:
        socioeconomicHTML = `<strong>Households on Local Authority Waiting List (per 1000 people): </strong>
                             ${normalisePer1000(boroughYearRelevantData, boroughPopulation).toFixed(2)}`;
        break;
      case 5:
        socioeconomicHTML = `<strong>Total Families Receiving Child Benefits (per 1000 people):</strong> 
                             ${normalisePer1000(boroughYearRelevantData, boroughPopulation).toFixed(2)}`;
        break;
      default:
        break; 
    }
    socioeconomicData.style.fontSize = "12px";
    socioeconomicData.innerHTML = `<strong> • </strong> ${socioeconomicHTML} ${boroughYearRelevantDataRank} <br>`;
    boroughIndicatorsText.appendChild(socioeconomicData);
    ++index;
  }
  const indicatorAcknowledgement = document.createElement("socioeconomic-source");
  indicatorAcknowledgement.style.fontSize = "11px";
  indicatorAcknowledgement.innerHTML = `Sources: London Data Store, Cambridge Assessment, 
                                Office for National Statistics (Nomis)<br>
                                Note: GCSE results from 2015 are estimates
                                using the Raw Average Point Score Per Pupil.`;
  boroughIndicatorsText.appendChild(indicatorAcknowledgement);
  showStatsPanel();
}

// Normalise a value of a region as a rate per 1000 people in the population of that region.
function normalisePer1000(value, population) {
  return (value / population) * 1000;
}

// Load and return the crime and population data for the selected year and calculate crime rates.
async function getCrimeRateData(year) {
  return Promise.all(
    [d3.csv(crimeDataPrefix + year + dataSuffix), d3.csv(populationDataPrefix + year + dataSuffix)]
  ).then(([crimeData, populationData]) => {
    const crimeRatesByBorough = {};
    const crimeSubtypeRatesByBorough = {};
    crimeData.forEach(entry => {
      if (entry["Area Type"] == "Borough") {
        const entryBoroughName = entry["Borough_SNT"].replace(/&/g, "and"); // Required for consistent formatting
        const entryCrimeCount = parseInt(entry["Count"], 10);
        let crimeType = entry["Crime Subtype"];
        if (crimeType.toLowerCase().includes("gun") || crimeType.toLowerCase().includes("lethal barrel")) {
          // A very low proportion of all crimes fall into the above categories. 
          // As all these crimes are firearms-related, they are grouped together for better comparison.
          crimeType = "Firearms-Related Crime";
        }
        else if (crimeType.toLowerCase().includes("domestic abuse violence with injury")) {
          // For some reason entries for this category don't have consistent capitalisation.
          // This aims to fix that.
          crimeType = "Domestic Violence with Injury";
        }
        if (!crimeRatesByBorough[entryBoroughName]) {
          crimeRatesByBorough[entryBoroughName] = entryCrimeCount;
        } else {
          crimeRatesByBorough[entryBoroughName] += entryCrimeCount;
        }
        if (!crimeSubtypeRatesByBorough[entryBoroughName]) {
          crimeSubtypeRatesByBorough[entryBoroughName] = {[crimeType] : entryCrimeCount};
        } else {
          if (!crimeSubtypeRatesByBorough[entryBoroughName][crimeType]) {
            crimeSubtypeRatesByBorough[entryBoroughName][crimeType] = entryCrimeCount;
          } else {
            crimeSubtypeRatesByBorough[entryBoroughName][crimeType] += entryCrimeCount;
          }
        }
      }
    });
    Object.entries(crimeRatesByBorough).forEach(([boroughName, boroughCrimeCount]) => {
      const boroughData = populationData.filter(entry => entry["Area name"] == boroughName)[0];
      if (!boroughData) {
        // Need to remove "Aviation Security", "Aviation Security(SO18)" and "Other / NK" as they aren't boroughs
        // and therefore do not have population data so are invalid.
        delete crimeRatesByBorough[boroughName];
        delete crimeSubtypeRatesByBorough[boroughName];
        return;
      }
      // Convert Crime Rates to be per 1000 people for better comparison between boroughs.
      const boroughPopulation = parseInt(boroughData["GLA Population estimate/ projection"].replace(/,/g, ""), 10); 
      crimeRatesByBorough[boroughName] = normalisePer1000(boroughCrimeCount, boroughPopulation);
      Object.entries(crimeSubtypeRatesByBorough[boroughName]).forEach(([crimeType, boroughSubtypeCrimeCount]) => {
        crimeSubtypeRatesByBorough[boroughName][crimeType] = normalisePer1000(boroughSubtypeCrimeCount, boroughPopulation);
      });
    });
    // Clean the Population dataset to remove entries that are not in the Crime dataset.
    const cleanedPopulationDataByBorough = populationData.filter(
      entry => Object.keys(crimeRatesByBorough).includes(entry["Area name"]));
    return {crimeRatesByBorough, crimeSubtypeRatesByBorough, cleanedPopulationDataByBorough};
  })
}

// Ensures the map accurately displays relevant tooltips and the legend for the selected year.
function updateMapDisplay(year) {
  const yearCrimeRatesByBorough = crimeRatesByBoroughByYear[year];
  mapColorScale.domain(Object.values(yearCrimeRatesByBorough).sort(d3.ascending));
  boroughPaths.attr("fill", function(d) {
    const boroughName = d.properties.neighbourhood;
    return mapColorScale(yearCrimeRatesByBorough[boroughName]);
  });
  boroughPaths.on("mouseover", function(event, d) {
    const boroughName = d.properties.neighbourhood;
    if (boroughName != "City of London") {
      // Crime Data does not record for the City of London area, so no tooltip is added.
      const crimeRate = yearCrimeRatesByBorough[boroughName];
      tooltip.style("display", "block")
        .html(`
          <strong>${boroughName}</strong>
          <br>
          ${`Crime Rate: ${crimeRate.toFixed(2)} per 1,000 people`}
        `)
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    }
  });  
  const dataValueThresholds = mapColorScale.quantiles();
  dataLegendTexts.text((d, i) => {
    if (i == 0) {
      return `< ${dataValueThresholds[0].toFixed(2)}`;
    } else if (i == mapColorScale.range().length - 1) {
      return `> ${dataValueThresholds[dataValueThresholds.length - 1].toFixed(2)}`;
    } else {
      return `${dataValueThresholds[i - 1].toFixed(2)} - ${dataValueThresholds[i].toFixed(2)}`;
    }
  });
}
