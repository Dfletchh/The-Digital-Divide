/**
 * Digital Divide Visualization - Main JavaScript
 * Narrative visualization showing global internet connectivity 2000-2024
 */

// Global state management
const globalState = {
    currentScene: 1,
    isTransitioning: false,
    
    // Data storage
    data: {
        connectivity: null,
        worldMap: null,
        processed: null
    },
    
    // Scene parameters
    scene1: {
        year: 2000,
        hoveredCountry: null,
        annotationX: 0
    },
    
    scene2: {
        currentYear: 2000,
        isAnimating: false,
        animationSpeed: 500,
        animationTimer: null,
        annotationX: 0
    },
    
    scene3: {
        selectedRegion: "all",
        hoveredCountry: null,
        showTrendline: true,
        scales: null,
        chartGroup: null,
        data2024: null,
        annotationX: 0
    }
};

// Visualization dimensions
const dimensions = {
    width: 960,
    height: 580,
    margin: { top: 20, right: 20, bottom: 60, left: 80 }
};

// Color scales
const colorScales = {
    scene1: d3.scaleSequential(d3.interpolateBlues).domain([0, 60]),
    scene2: d3.scaleSequential(d3.interpolateViridis).domain([0, 100]),
    scene3: d3.scaleOrdinal(d3.schemeCategory10)
};

/**
 * Init the app
 */
async function init() {
    console.log("Initializing Digital Divide Visualization...");
    
    try {
        // Show loading screen
        showLoading(true);
        
        // Load data
        await loadData();
        
        // Wait a bit to ensure data is fully processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set up event listeners
        setupEventListeners();
        
        // Ensure we start with scene 1 active state
        globalState.currentScene = 0; // Reset so showScene(1) will actually run
        
        // Initialize first scene
        showScene(1);
        
        // Hide loading screen
        showLoading(false);
        
        console.log("Initialization complete!");
        
    } catch (error) {
        console.error("Initialization failed:", error);
        showError("Failed to load data. Please check your data files.");
    }
}

/**
 * Load all required data
 */
async function loadData() {
    console.log("Loading data...");
    
    try {
        // Load connectivity data 
        const connectivityData = await d3.csv("data/connectivityfull.csv", d => ({
            country: d.country,
            countryCode: d.countryCode,
            year: +d.year,
            internetPenetration: +d.internetPenetration,
            gdpPerCapita: +d.gdpPerCapita,
            population: d.population ? +d.population : 50000000,  // Fallback if missing
            region: d.region
        }));
        
        // Load world map data
        const worldMapData = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas/countries-50m.json");
        
        // Store raw data
        globalState.data.connectivity = connectivityData;
        globalState.data.worldMap = worldMapData;
        
        // Process and validate data
        processData();
        
        console.log(`Loaded ${connectivityData.length} connectivity records`);
        console.log(`Loaded world map with ${worldMapData.objects.countries.geometries.length} countries`);
        
    } catch (error) {
        console.error("Data loading error:", error);
        throw new Error(`Data loading failed: ${error.message}`);
    }
}

/**
 * Process raw data for visualization
 */
function processData() {
    const connectivity = globalState.data.connectivity;
    
    // Group data by year
    const dataByYear = d3.group(connectivity, d => d.year);
    
    // Create processed data structure
    globalState.data.processed = {
        byYear: dataByYear,
        countries: [...new Set(connectivity.map(d => d.country))],
        years: [...new Set(connectivity.map(d => d.year))].sort(),
        regions: [...new Set(connectivity.map(d => d.region))]
    };
    
    console.log("Data processed:", {
        years: globalState.data.processed.years,
        countries: globalState.data.processed.countries.length,
        regions: globalState.data.processed.regions
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Scene navigation buttons
    d3.selectAll(".scene-btn").on("click", function() {
        const sceneNumber = +this.dataset.scene;
        showScene(sceneNumber);
    });
    
    // Scene 2 controls
    d3.select("#play-pause-btn").on("click", toggleAnimation);
    d3.select("#reset-btn").on("click", resetAnimation);
    d3.select("#year-slider").on("input", function() {
        updateYear(+this.value);
    });
    d3.select("#speed-control").on("change", function() {
        globalState.scene2.animationSpeed = +this.value;
        if (globalState.scene2.isAnimating) {
            if (globalState.scene2.animationTimer) {
                globalState.scene2.animationTimer.stop();
            }
            startAnimation();
        }
    });
    
    // Scene 3 controls
    d3.select("#region-filter").on("change", function() {
        globalState.scene3.selectedRegion = this.value;
        if (globalState.currentScene === 3) {
            updateScene3();
        }
    });
    
    d3.select("#show-trendline").on("change", function() {
        globalState.scene3.showTrendline = this.checked;
        if (globalState.currentScene === 3) {
            updateScene3();
        }
    });
    
    console.log("Event listeners set up");
}

/**
 * Show specific scene
 */
function showScene(sceneNumber) {
    if (globalState.isTransitioning) {
        console.log(`Skipping scene ${sceneNumber} - already transitioning`);
        return;
    }
    
    if (globalState.currentScene === sceneNumber) {
        console.log(`Already on scene ${sceneNumber} - forcing refresh`);
        // Don't return - allow refresh for debugging
    }
    
    console.log(`Transitioning to scene ${sceneNumber}`);
    globalState.isTransitioning = true;
    
    // Update navigation FIRST
    updateNavigation(sceneNumber);
    
    // Clear current visualization
    clearVisualization();
    
    // Wait for DOM to update
    setTimeout(() => {
        // Show new scene
        switch (sceneNumber) {
            case 1:
                showScene1();
                break;
            case 2:
                showScene2();
                break;
            case 3:
                showScene3();
                break;
        }
        
        globalState.currentScene = sceneNumber;
        globalState.isTransitioning = false;
    }, 50);
}

/**
 * Update navigation UI
 */
function updateNavigation(sceneNumber) {
    // Update button states
    d3.selectAll(".scene-btn").classed("active", false);
    d3.select(`[data-scene="${sceneNumber}"]`).classed("active", true);
    
    // Update progress bar
    const progress = (sceneNumber - 1) / 2 * 100;
    d3.select("#progress-bar").style("width", `${progress}%`);
    
    // Update scene controls
    d3.selectAll(".scene-controls").classed("active", false);
    d3.select(`#scene${sceneNumber}-controls`).classed("active", true);
    
    // Update titles
    const titles = {
        1: { title: "The Digital Dark Age", desc: "In the year 2000, most of the world was offline" },
        2: { title: "The Connected Revolution", desc: "Watch as the world comes online (2000-2024)" },
        3: { title: "Today's Digital Divide", desc: "Wealth and connectivity in the modern world" }
    };
    
    d3.select("#current-scene-title").text(titles[sceneNumber].title);
    d3.select("#current-scene-description").text(titles[sceneNumber].desc);
}

/**
 * Clear visualization area
 */
function clearVisualization() {
    d3.select("#visualization").selectAll("*").remove();
}

/**
 * Scene 1: Static map of 2000 data
 */
function showScene1() {
    console.log("Rendering Scene 1: The Digital Dark Age (2000)");
    
    const data2000 = globalState.data.processed.byYear.get(2000) || [];
    
    if (data2000.length === 0) {
        console.warn("No data available for year 2000");
        showError("No data available for the year 2000");
        return;
    }
    
    console.log(`Scene 1: Found ${data2000.length} records for year 2000`);
    
    // Create SVG
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);
    
    // Set up map projection
    const projection = d3.geoNaturalEarth1()
        .scale(150)
        .translate([dimensions.width / 2, 250]);
    
    const path = d3.geoPath().projection(projection);
    
    // Convert TopoJSON to GeoJSON
    const countries = topojson.feature(globalState.data.worldMap, globalState.data.worldMap.objects.countries);
    
    console.log(`Scene 1: Processing ${countries.features.length} geographic features`);
    
    // Create data lookup with multiple mapping strategies
    const dataLookup = new Map();
    const nameToCodeMap = new Map();
    
    data2000.forEach(d => {
        // Multi mapping approaches
        dataLookup.set(d.countryCode, d);  // Original 3-letter codes
        dataLookup.set(d.countryCode.toLowerCase(), d);  // Lowercase
        nameToCodeMap.set(d.country.toLowerCase(), d);  // By country name
        
        // Add common alternative codes/names
        const alternatives = getCountryAlternatives(d.countryCode, d.country);
        alternatives.forEach(alt => {
            dataLookup.set(alt, d);
        });
    });
    
    // Function to find country data w/ multiple strategies
    function findCountryData(geoFeature) {
        const geoId = geoFeature.id;
        const geoProps = geoFeature.properties;
        
        // Strategy 1: Direct ID match
        let data = dataLookup.get(geoId);
        if (data) return data;
        
        // Strategy 2: Numeric ID to ISO conversion
        const isoCode = numericToISO(geoId);
        if (isoCode) {
            data = dataLookup.get(isoCode);
            if (data) return data;
        }
        
        // Strategy 3: Try different property names for country name
        let geoName = null;
        if (geoProps) {
            geoName = geoProps.NAME || geoProps.name || geoProps.NAME_EN || 
                     geoProps.NAME_LONG || geoProps.ADMIN || geoProps.NAME_SORT;
        }
        
        if (geoName) {
            // Strategy 4: Name-based matching
            data = nameToCodeMap.get(geoName.toLowerCase());
            if (data) return data;
            
            // Strategy 5: Fuzzy name matching
            data = fuzzyNameMatch(geoName, nameToCodeMap);
            if (data) return data;
        }
        
        return null;
    }
    
    let matchedCount = 0;
    let totalCount = countries.features.length;
    
    // Draw countries
    svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const countryData = findCountryData(d);
            if (!countryData) {
                return "#e2e8f0"; // No data color
            }
            matchedCount++;
            return colorScales.scene1(countryData.internetPenetration);
        })
        .on("mouseover", function(event, d) {
            showTooltip(event, d, findCountryData(d));
        })
        .on("mouseout", hideTooltip);
    
    console.log(`Scene 1 Complete: Matched ${matchedCount} out of ${totalCount} countries with data`);
    
    // Create legend
    createLegend1(svg);
    
    // Add title annotation
    addAnnotation(svg, `${matchedCount} countries matched`, 
        "Gray areas lack connectivity data", globalState.scene1.annotationX, 485);
}

/**
 * Scene 2: Animated timeline
 */
function showScene2() {
    console.log("Rendering Scene 2: The Connected Revolution");
    
    // Reset scene 2 state
    globalState.scene2.currentYear = 2000;
    globalState.scene2.isAnimating = false;
    if (globalState.scene2.animationTimer) {
        globalState.scene2.animationTimer.stop();
    }
    
    // Create SVG
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);
    
    // Set up map projection
    const projection = d3.geoNaturalEarth1()
        .scale(150)
        .translate([dimensions.width / 2, 250]);
    
    const path = d3.geoPath().projection(projection);
    
    // Convert TopoJSON to GeoJSON
    const countries = topojson.feature(globalState.data.worldMap, globalState.data.worldMap.objects.countries);
    
    // Create the same data lookup system
    function createDataLookup(yearData) {
        const dataLookup = new Map();
        const nameToCodeMap = new Map();
        
        yearData.forEach(d => {
            dataLookup.set(d.countryCode, d);
            dataLookup.set(d.countryCode.toLowerCase(), d);
            nameToCodeMap.set(d.country.toLowerCase(), d);
            
            const alternatives = getCountryAlternatives(d.countryCode, d.country);
            alternatives.forEach(alt => {
                dataLookup.set(alt, d);
            });
        });
        
        return { dataLookup, nameToCodeMap };
    }
    
    // Function to find country data
    function findCountryData(geoFeature, dataLookup, nameToCodeMap) {
        const geoId = geoFeature.id;
        const geoProps = geoFeature.properties;
        
        // Strategy 1: Direct ID match
        let data = dataLookup.get(geoId);
        if (data) return data;
        
        // Strategy 2: Numeric ID to ISO conversion
        const isoCode = numericToISO(geoId);
        if (isoCode) {
            data = dataLookup.get(isoCode);
            if (data) return data;
        }
        
        // Strategy 3: Name-based matching
        let geoName = null;
        if (geoProps) {
            geoName = geoProps.NAME || geoProps.name || geoProps.NAME_EN || 
                     geoProps.NAME_LONG || geoProps.ADMIN || geoProps.NAME_SORT;
        }
        
        if (geoName) {
            data = nameToCodeMap.get(geoName.toLowerCase());
            if (data) return data;
            
            data = fuzzyNameMatch(geoName, nameToCodeMap);
            if (data) return data;
        }
        
        return null;
    }
    
    // Draw initial countries (2000 data)
    const initialData = globalState.data.processed.byYear.get(2000) || [];
    const { dataLookup: initialLookup, nameToCodeMap: initialNameMap } = createDataLookup(initialData);
    
    const countryPaths = svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const countryData = findCountryData(d, initialLookup, initialNameMap);
            if (!countryData) return "#e2e8f0";
            return colorScales.scene2(countryData.internetPenetration);
        })
        .on("mouseover", function(event, d) {
            const currentData = globalState.data.processed.byYear.get(globalState.scene2.currentYear) || [];
            const { dataLookup, nameToCodeMap } = createDataLookup(currentData);
            showTooltipWithYear(event, d, findCountryData(d, dataLookup, nameToCodeMap), globalState.scene2.currentYear);
        })
        .on("mouseout", hideTooltip);
    
    // Update function for animation
    function updateMapForYear(year) {
        const yearData = globalState.data.processed.byYear.get(year) || [];
        const { dataLookup, nameToCodeMap } = createDataLookup(yearData);
        
        countryPaths
            .transition()
            .duration(300)
            .attr("fill", d => {
                const countryData = findCountryData(d, dataLookup, nameToCodeMap);
                if (!countryData) return "#e2e8f0";
                return colorScales.scene2(countryData.internetPenetration);
            });
        
        // Update year display
        d3.select("#current-year").text(year);
        d3.select("#year-slider").property("value", year);
        
        // Update annotation
        const globalAverage = calculateGlobalAverage(year);
        updateAnnotation2(svg, year, globalAverage);
    }
    
    // Store the update function globally for controls
    globalState.scene2.updateFunction = updateMapForYear;
    
    // Create legend
    createLegend2(svg);
    
    // Initial annotation
    const initialAverage = calculateGlobalAverage(2000);
    addAnnotation2(svg, 2000, initialAverage);
    
    console.log("Scene 2 setup complete");
}

/**
 * Scene 3: Scatterplot exploration
 */
function showScene3() {
    console.log("Rendering Scene 3: Today's Digital Divide");
    
    // Get 2024 data
    const data2024 = globalState.data.processed.byYear.get(2024) || [];
    
    if (data2024.length === 0) {
        console.warn("No data available for year 2024");
        showError("No data available for the year 2024");
        return;
    }
    
    console.log(`Scene 3: Found ${data2024.length} records for 2024`);
    
    // Create SVG
    const margin = { top: 20, right: 20, bottom: 80, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;
    
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);
    
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Set up scales
    const xScale = d3.scaleLog()
        .domain([Math.max(200, d3.min(data2024, d => d.gdpPerCapita) * 0.9), d3.max(data2024, d => d.gdpPerCapita) * 1.1])
        .range([0, width])
        .clamp(true);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    // Size scale for population (bubble size)
    const sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(data2024, d => d.population)])
        .range([4, 20]); // Made minimum size larger and max smaller for better visibility
    
    // Color scale for regions
    const regions = [...new Set(data2024.map(d => d.region))];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(regions);
    
    //! Debug the scale setup
    // console.log("GDP range:", d3.extent(data2024, d => d.gdpPerCapita));
    // console.log("Internet range:", d3.extent(data2024, d => d.internetPenetration));
    // console.log("Population range:", d3.extent(data2024, d => d.population));
    // console.log("Regions:", regions);
    
    // Store scales globally for updates
    globalState.scene3.scales = { xScale, yScale, sizeScale, colorScale };
    globalState.scene3.chartGroup = chart;
    globalState.scene3.data2024 = data2024;
    
    // Create axes with thousands notation formatting
    const xAxis = d3.axisBottom(xScale)
        .tickValues([200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000])
        .tickFormat(d => {
            if (d === 200) return "0.2";
            if (d === 500) return "0.5";
            if (d === 1000) return "1";
            if (d === 2000) return "2";
            if (d === 5000) return "5";
            if (d === 10000) return "10";
            if (d === 20000) return "20";
            if (d === 50000) return "50";
            if (d === 100000) return "100";
            // Fallback for any other values
            return (d/1000).toString();
        });
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => `${d}%`);
    
    // Add X axis
    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);
    
    // Add Y axis
    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
    
    // Add axis labels
    chart.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${width/2}, ${height + 50})`)
        .style("text-anchor", "middle")
        .text("GDP per Capita (Thousands USD)");
    
    chart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -height/2)
        .style("text-anchor", "middle")
        .text("Internet Penetration (%)");
    
    // Create legend
    createLegend3(svg, regions, colorScale);
    
    // Add annotation
    addAnnotation3(svg);
    
    // Ensure DOM is ready before creating circles
    setTimeout(() => {
        updateScatterplot();
    }, 0);
    
    console.log("Scene 3 setup complete");
}

/**
 * Update scatterplot based on current filters
 */
function updateScatterplot() {
    if (globalState.currentScene !== 3) return;
    
    const { xScale, yScale, sizeScale, colorScale } = globalState.scene3.scales;
    const chart = globalState.scene3.chartGroup;
    const data2024 = globalState.scene3.data2024;
    
    // Filter data based on selected region
    let filteredData = data2024;
    if (globalState.scene3.selectedRegion !== "all") {
        filteredData = data2024.filter(d => d.region === globalState.scene3.selectedRegion);
    }
    
    console.log(`Scene 3 Update: Showing ${filteredData.length} countries`);
    
    // Update circles with new filtered data
    const circles = chart.selectAll(".dot")
        .data(filteredData, d => d.countryCode);
    
    // Remove circles not in filtered data
    circles.exit()
        .transition()
        .duration(300)
        .attr("r", 0)
        .attr("opacity", 0)
        .remove();
    
    // Add new circles (if any)
    const newCircles = circles.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.gdpPerCapita))
        .attr("cy", d => yScale(d.internetPenetration))
        .attr("r", 0)
        .attr("fill", d => colorScale(d.region))
        .attr("stroke", "rgba(255, 255, 255, 0.7)")
        .attr("stroke-width", 1)
        .attr("opacity", 0)
        .on("mouseover", function(event, d) {
            showScatterplotTooltip(event, d);
            d3.select(this).attr("stroke-width", 3);
        })
        .on("mouseout", function(event, d) {
            hideTooltip();
            d3.select(this).attr("stroke-width", 1);
        });
    
    // Update all circles (existing + new)
    newCircles.merge(circles)
        .transition()
        .duration(500)
        .attr("cx", d => xScale(d.gdpPerCapita))
        .attr("cy", d => yScale(d.internetPenetration))
        .attr("r", d => sizeScale(d.population))
        .attr("fill", d => colorScale(d.region))
        .attr("opacity", 0.7);
    
    console.log("Scatterplot updated");
    
    // Update trend line
    updateTrendLine(filteredData);
}

/**
 * Update trend line
 */
function updateTrendLine(data) {
    const chart = globalState.scene3.chartGroup;
    const { xScale, yScale } = globalState.scene3.scales;
    
    // Remove existing trend line
    chart.select(".trend-line").remove();
    
    if (!globalState.scene3.showTrendline || data.length < 3) {
        return;
    }
    
    // Calculate linear regression
    const regression = calculateLinearRegression(data);
    if (!regression) return;
    
    // Create trend line points
    const xMin = d3.min(data, d => d.gdpPerCapita);
    const xMax = d3.max(data, d => d.gdpPerCapita);
    
    const trendData = [
        { x: xMin, y: regression.slope * Math.log10(xMin) + regression.intercept },
        { x: xMax, y: regression.slope * Math.log10(xMax) + regression.intercept }
    ];
    
    // Clamp y values to visible range
    trendData.forEach(d => {
        d.y = Math.max(0, Math.min(100, d.y));
    });
    
    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));
    
    // Add trend line
    chart.append("path")
        .datum(trendData)
        .attr("class", "trend-line")
        .attr("d", line)
        .style("stroke", "#e53e3e")
        .style("stroke-width", 3)
        .style("stroke-dasharray", "8,4")
        .style("fill", "none")
        .style("opacity", 0.8);
}

/**
 * Calculate linear regression for log-scale GDP
 */
function calculateLinearRegression(data) {
    if (data.length < 3) return null;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    data.forEach(d => {
        const x = Math.log10(d.gdpPerCapita); // Log transform for x
        const y = d.internetPenetration;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

/**
 * Create legend for Scene 1
 */
function createLegend1(svg) {
    const legendWidth = 300;
    const legendHeight = 20;
    
    // Calculate centered positioning for legend + annotation group
    const totalGroupWidth = 300 + 40 + 260; // legend + gap + annotation
    const groupStartX = (dimensions.width - totalGroupWidth) / 2;
    const legendX = groupStartX;
    const legendY = 520;
    
    // Create legend group
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Legend background
    legend.append("rect")
        .attr("x", -15)
        .attr("y", -35)
        .attr("width", legendWidth + 30)
        .attr("height", 75)
        .attr("rx", 6)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
    
    // Create gradient
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient");
    
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const percent = i / steps * 100;
        const value = i / steps * 60; // 0-60% range
        gradient.append("stop")
            .attr("offset", `${percent}%`)
            .attr("stop-color", colorScales.scene1(value));
    }
    
    // Legend title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Internet Penetration (2000)");
    
    // Legend rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
    
    // Legend labels
    legend.append("text")
        .attr("x", 5)
        .attr("y", 30)
        .style("font-size", "12px")
        .text("0%");
    
    legend.append("text")
        .attr("x", legendWidth - 5)
        .attr("y", 30)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text("60%");
        
    // Store the annotation X position for use in the annotation function
    globalState.scene1.annotationX = groupStartX + 300 + 40; // legend width + gap
}

/**
 * Create legend for Scene 2
 */
function createLegend2(svg) {
    const legendWidth = 300;
    const legendHeight = 20;
    
    // Calculate centered positioning for legend + annotation group
    const totalGroupWidth = 300 + 40 + 260; // legend + gap + annotation
    const groupStartX = (dimensions.width - totalGroupWidth) / 2;
    const legendX = groupStartX;
    const legendY = 520;
    
    // Create legend group
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Legend background
    legend.append("rect")
        .attr("x", -15)
        .attr("y", -35)
        .attr("width", legendWidth + 30)
        .attr("height", 75)
        .attr("rx", 6)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
    
    // Create gradient
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient-2");
    
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const percent = i / steps * 100;
        const value = i / steps * 100; // 0-100% range
        gradient.append("stop")
            .attr("offset", `${percent}%`)
            .attr("stop-color", colorScales.scene2(value));
    }
    
    // Legend title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Internet Penetration (%)");
    
    // Legend rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient-2)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
    
    // Legend labels
    legend.append("text")
        .attr("x", 5)
        .attr("y", 30)
        .style("font-size", "12px")
        .text("0%");
    
    legend.append("text")
        .attr("x", legendWidth - 5)
        .attr("y", 30)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text("100%");
        
    // Store the annotation X position for use in the annotation function
    globalState.scene2.annotationX = groupStartX + 300 + 40; // legend width + gap
}

/**
 * Create legend for Scene 3
 */
function createLegend3(svg, regions, colorScale) {
    const itemWidth = 120;
    const itemsPerRow = 3;
    const rows = Math.ceil(regions.length / itemsPerRow);
    const legendWidth = itemsPerRow * itemWidth; // 360px
    
    // Calculate centered positioning for legend + annotation group
    const totalGroupWidth = legendWidth + 40 + 260; // 360 + 40 + 260 = 660px
    const groupStartX = (dimensions.width - totalGroupWidth) / 2; // (960-660)/2 = 150px
    const legendX = groupStartX;
    const legendY = 495;
    
    const legend = svg.append("g")
        .attr("class", "scene3-legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    
    // Legend background
    legend.append("rect")
        .attr("x", -10)
        .attr("y", -30)
        .attr("width", legendWidth + 20) // 380px 
        .attr("height", rows * 22 + 35) // 3*22+35 = 101px
        .attr("rx", 6)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
    
    // Legend title
    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .text("Regions");
    
    // Legend items arranged in 3-column grid
    const legendItems = legend.selectAll(".legend-item")
        .data(regions)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            const col = i % itemsPerRow;
            const row = Math.floor(i / itemsPerRow);
            const x = col * itemWidth + 10;
            const y = 15 + row * 22;
            return `translate(${x}, ${y})`;
        });
    
    legendItems.append("circle")
        .attr("cx", 6)
        .attr("cy", 0)
        .attr("r", 5)
        .style("fill", d => colorScale(d));
    
    legendItems.append("text")
        .attr("x", 16)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .text(d => {
            if (d.length > 14) {
                return d.substring(0, 14) + "...";
            }
            return d;
        });
        
    // Store the annotation X position for use in the annotation function
    globalState.scene3.annotationX = groupStartX + legendWidth + 40; // 150 + 360 + 40 = 550
}

/**
 * Helper function to get alternative country codes/names
 */
function getCountryAlternatives(code, name) {
    const alternatives = [];
    
    // Common alternative mappings
    const mappings = {
        'USA': ['US', '840', 'united states', 'america'],
        'GBR': ['GB', '826', 'uk', 'britain', 'england'],
        'DEU': ['DE', '276', 'deutschland'],
        'FRA': ['FR', '250'],
        'CHN': ['CN', '156'],
        'IND': ['IN', '356'],
        'BRA': ['BR', '076'],
        'RUS': ['RU', '643', 'russian federation'],
        'JPN': ['JP', '392'],
        'CAN': ['CA', '124'],
        'AUS': ['AU', '036'],
        'KOR': ['KR', '410', 'south korea'],
        'MEX': ['MX', '484'],
        'TUR': ['TR', '792'],
        'ZAF': ['ZA', '710', 'south africa']
    };
    
    if (mappings[code]) {
        alternatives.push(...mappings[code]);
    }
    
    return alternatives;
}

/**
 * Convert numeric country ID to ISO code (for Natural Earth data)
 */
function numericToISO(numericId) {
    const mapping = {
        // Major countries from our dataset
        '840': 'USA', '276': 'DEU', '392': 'JPN', '826': 'GBR', '250': 'FRA',
        '124': 'CAN', '036': 'AUS', '410': 'KOR', '752': 'SWE', '578': 'NOR',
        '156': 'CHN', '356': 'IND', '076': 'BRA', '643': 'RUS', '484': 'MEX',
        '360': 'IDN', '792': 'TUR', '710': 'ZAF', '764': 'THA', '458': 'MYS',
        '566': 'NGA', '050': 'BGD', '586': 'PAK', '231': 'ETH', '404': 'KEN',
        '288': 'GHA', '800': 'UGA', '834': 'TZA', '686': 'SEN', '116': 'KHM',
        '032': 'ARG', '152': 'CHL', '616': 'POL', '203': 'CZE', '348': 'HUN',
        '620': 'PRT', '300': 'GRC', '191': 'HRV', '233': 'EST', '440': 'LTU',
        '682': 'SAU', '784': 'ARE', '414': 'KWT', '634': 'QAT', '048': 'BHR',
        '702': 'SGP', '554': 'NZL', '352': 'ISL', '470': 'MLT', '196': 'CYP',
        
        // Additional mappings that might appear
        '724': 'ESP', // Spain
        '380': 'ITA', // Italy
        '528': 'NLD', // Netherlands  
        '056': 'BEL', // Belgium
        '040': 'AUT', // Austria
        '756': 'CHE', // Switzerland
        '208': 'DNK', // Denmark
        '246': 'FIN', // Finland
        '372': 'IRL', // Ireland
        '442': 'LUX', // Luxembourg
        '620': 'PRT', // Portugal
        '705': 'SVN', // Slovenia
        '703': 'SVK', // Slovakia
        '100': 'BGR', // Bulgaria
        '642': 'ROU', // Romania
        '804': 'UKR', // Ukraine
        '112': 'BLR', // Belarus
        '428': 'LVA', // Latvia
        '070': 'BIH', // Bosnia
        '688': 'SRB', // Serbia
        '807': 'MKD', // North Macedonia
        '499': 'MNE', // Montenegro
        '008': 'ALB'  // Albania
    };
    
    return mapping[String(numericId)] || null;
}

/**
 * Fuzzy name matching for countries
 */
function fuzzyNameMatch(geoName, nameMap) {
    if (!geoName) return null;  // Handle null/undefined names
    
    const lowerGeoName = geoName.toLowerCase();
    
    // Try exact match first
    if (nameMap.has(lowerGeoName)) {
        return nameMap.get(lowerGeoName);
    }
    
    // Try partial matches
    for (let [name, data] of nameMap) {
        if (name.includes(lowerGeoName) || lowerGeoName.includes(name)) {
            return data;
        }
    }
    
    // Handle specific cases
    const specialCases = {
        'united states of america': 'united states',
        'russian federation': 'russia', 
        'united kingdom': 'united kingdom',
        'korea': 'south korea',
        'czech republic': 'czech republic',
        'great britain': 'united kingdom',
        'britain': 'united kingdom',
        'england': 'united kingdom',
        'usa': 'united states',
        'america': 'united states',
        'deutschland': 'germany',
        'south korea': 'south korea',
        'republic of korea': 'south korea'
    };
    
    const specialMatch = specialCases[lowerGeoName];
    if (specialMatch && nameMap.has(specialMatch)) {
        return nameMap.get(specialMatch);
    }
    
    return null;
}

/**
 * Calculate global average internet penetration for a year
 */
function calculateGlobalAverage(year) {
    const yearData = globalState.data.processed.byYear.get(year) || [];
    if (yearData.length === 0) return 0;
    
    const sum = yearData.reduce((acc, d) => acc + d.internetPenetration, 0);
    return Math.round((sum / yearData.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Add annotation to scene
 */
function addAnnotation(svg, title, text, x, y) {
    const annotation = svg.append("g")
        .attr("class", "annotation")
        .attr("transform", `translate(${x}, ${y})`);
    
    // Background
    annotation.append("rect")
        .attr("width", 260)
        .attr("height", 75)
        .attr("rx", 8)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 2);
    
    // Title
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 25)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#2d3748")
        .text(title);
    
    // Description
    const words = text.split(' ');
    let line = '';
    let lineNumber = 0;
    const lineHeight = 16;
    const maxLineLength = 28; // Adjusted for narrower width
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (testLine.length > maxLineLength && line !== '') {
            annotation.append("text")
                .attr("x", 15)
                .attr("y", 45 + (lineNumber * lineHeight))
                .style("font-size", "12px")
                .style("fill", "#4a5568")
                .text(line);
            line = words[i] + ' ';
            lineNumber++;
        } else {
            line = testLine;
        }
    }
    // Add the last line
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 45 + (lineNumber * lineHeight))
        .style("font-size", "12px")
        .style("fill", "#4a5568")
        .text(line);
}

/**
 * Add initial annotation for Scene 2
 */
function addAnnotation2(svg, year, globalAverage) {
    const annotation = svg.append("g")
        .attr("class", "scene2-annotation")
        .attr("transform", `translate(${globalState.scene2.annotationX}, 485)`); // Using calculated position
    
    // Background
    annotation.append("rect")
        .attr("width", 260)
        .attr("height", 75)
        .attr("rx", 8)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 2);
    
    // Title
    annotation.append("text")
        .attr("class", "annotation-title")
        .attr("x", 15)
        .attr("y", 25)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#2d3748")
        .text(`${year}: Internet Revolution`);
    
    // Stats
    annotation.append("text")
        .attr("class", "annotation-year")
        .attr("x", 15)
        .attr("y", 45)
        .style("font-size", "12px")
        .style("fill", "#4a5568")
        .text(`Year: ${year}`);
        
    annotation.append("text")
        .attr("class", "annotation-average")
        .attr("x", 15)
        .attr("y", 60)
        .style("font-size", "12px")
        .style("fill", "#4a5568")
        .text(`Global Average: ${globalAverage}%`);
}

/**
 * Update annotation for Scene 2
 */
function updateAnnotation2(svg, year, globalAverage) {
    svg.select(".annotation-title")
        .text(`${year}: Internet Revolution`);
    
    svg.select(".annotation-year")
        .text(`Year: ${year}`);
    
    svg.select(".annotation-average")
        .text(`Global Average: ${globalAverage}%`);
}

/**
 * Add annotation for Scene 3
 */
function addAnnotation3(svg) {
    const annotation = svg.append("g")
        .attr("class", "scene3-annotation")
        .attr("transform", `translate(${globalState.scene3.annotationX}, 465)`);
    
    // Background
    annotation.append("rect")
        .attr("width", 260)
        .attr("height", 75)
        .attr("rx", 8)
        .style("fill", "rgba(255, 255, 255, 0.95)")
        .style("stroke", "#333")
        .style("stroke-width", 2);
    
    // Title
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 20)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#2d3748")
        .text("Digital Divide 2024");
    
    // Description
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 38)
        .style("font-size", "11px")
        .style("fill", "#4a5568")
        .text("Wealth strongly correlates with");
        
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 51)
        .style("font-size", "11px")
        .style("fill", "#4a5568")
        .text("internet connectivity");
        
    annotation.append("text")
        .attr("x", 15)
        .attr("y", 66)
        .style("font-size", "10px")
        .style("fill", "#666")
        .text("Size = Population | Filter by region");
}

/**
 * Show tooltip
 */
function showTooltip(event, geoData, countryData) {
    const tooltip = d3.select("#tooltip");
    
    if (!countryData) {
        const geoName = geoData.properties ? 
            (geoData.properties.NAME || geoData.properties.name || geoData.properties.NAME_EN || 
             geoData.properties.ADMIN || `Country ${geoData.id}`) : `Country ${geoData.id}`;
            
        d3.select("#tooltip-title").text(geoName);
        d3.select("#tooltip-text").text("No connectivity data available");
    } else {
        d3.select("#tooltip-title").text(countryData.country);
        d3.select("#tooltip-text").html(`
            Internet Users: <strong>${countryData.internetPenetration.toFixed(1)}%</strong><br>
            GDP per capita: <strong>$${countryData.gdpPerCapita.toLocaleString()}</strong><br>
            Region: <strong>${countryData.region}</strong>
        `);
    }
    
    tooltip
        .classed("visible", true)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

/**
 * Show tooltip with year information
 */
function showTooltipWithYear(event, geoData, countryData, year) {
    const tooltip = d3.select("#tooltip");
    
    if (!countryData) {
        const geoName = geoData.properties ? 
            (geoData.properties.NAME || geoData.properties.name || geoData.properties.NAME_EN || 
             geoData.properties.ADMIN || `Country ${geoData.id}`) : `Country ${geoData.id}`;
            
        d3.select("#tooltip-title").text(geoName);
        d3.select("#tooltip-text").text(`No data available for ${year}`);
    } else {
        d3.select("#tooltip-title").text(countryData.country);
        d3.select("#tooltip-text").html(`
            <strong>${year} Data:</strong><br>
            Internet Users: <strong>${countryData.internetPenetration.toFixed(1)}%</strong><br>
            GDP per capita: <strong>$${countryData.gdpPerCapita.toLocaleString()}</strong><br>
            Region: <strong>${countryData.region}</strong>
        `);
    }
    
    tooltip
        .classed("visible", true)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

/**
 * Show scatterplot tooltip
 */
function showScatterplotTooltip(event, countryData) {
    const tooltip = d3.select("#tooltip");
    
    d3.select("#tooltip-title").text(countryData.country);
    d3.select("#tooltip-text").html(`
        <strong>2024 Statistics:</strong><br>
        Internet Users: <strong>${countryData.internetPenetration.toFixed(1)}%</strong><br>
        GDP per capita: <strong>$${countryData.gdpPerCapita.toLocaleString()}</strong><br>
        Population: <strong>${(countryData.population / 1000000).toFixed(1)}M</strong><br>
        Region: <strong>${countryData.region}</strong>
    `);
    
    tooltip
        .classed("visible", true)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.select("#tooltip").classed("visible", false);
}

/**
 * Animation controls for Scene 2
 */
function toggleAnimation() {
    if (globalState.currentScene !== 2) return;
    
    globalState.scene2.isAnimating = !globalState.scene2.isAnimating;
    const button = d3.select("#play-pause-btn");
    
    if (globalState.scene2.isAnimating) {
        button.text("⏸ Pause");
        startAnimation();
    } else {
        button.text("▶ Play");
        if (globalState.scene2.animationTimer) {
            globalState.scene2.animationTimer.stop();
        }
    }
}

function startAnimation() {
    // If already at the end, reset to beginning
    if (globalState.scene2.currentYear >= 2024) {
        globalState.scene2.currentYear = 2000;
    }
    
    globalState.scene2.animationTimer = d3.interval(() => {
        if (!globalState.scene2.isAnimating) {
            globalState.scene2.animationTimer.stop();
            return;
        }
        
        globalState.scene2.currentYear++;
        
        // Update the map
        if (globalState.scene2.updateFunction) {
            globalState.scene2.updateFunction(globalState.scene2.currentYear);
        }
        
        // Check if we've reached the end
        if (globalState.scene2.currentYear >= 2024) {
            globalState.scene2.isAnimating = false;
            d3.select("#play-pause-btn").text("▶ Play");
            globalState.scene2.animationTimer.stop();
        }
    }, globalState.scene2.animationSpeed);
}

function resetAnimation() {
    if (globalState.currentScene !== 2) return;
    
    // Stop any running animation
    globalState.scene2.isAnimating = false;
    if (globalState.scene2.animationTimer) {
        globalState.scene2.animationTimer.stop();
    }
    
    // Reset to 2000
    globalState.scene2.currentYear = 2000;
    
    // Update UI
    d3.select("#play-pause-btn").text("▶ Play");
    
    // Update the map
    if (globalState.scene2.updateFunction) {
        globalState.scene2.updateFunction(2000);
    }
}

function updateYear(year) {
    if (globalState.currentScene !== 2) return;
    
    // Stop animation when user manually changes year
    globalState.scene2.isAnimating = false;
    if (globalState.scene2.animationTimer) {
        globalState.scene2.animationTimer.stop();
    }
    
    // Update state
    globalState.scene2.currentYear = year;
    
    // Update UI
    d3.select("#play-pause-btn").text("▶ Play");
    
    // Update the map
    if (globalState.scene2.updateFunction) {
        globalState.scene2.updateFunction(year);
    }
}

function updateScene3() {
    if (globalState.currentScene !== 3) return;
    updateScatterplot();
}

/**
 * Utility functions
 */
function showLoading(show) {
    d3.select("#loading-screen").classed("hidden", !show);
}

function showError(message) {
    console.error(message);
    alert(message);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);