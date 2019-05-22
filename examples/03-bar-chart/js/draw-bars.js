/*
  Generate a histogram to display values on the x-axis and frequency of those values on the y-axis.

  In order to show frequency, values are placed in equally sized bins (visualized as individual bars).
  For example, bins could be created for dew point temperatures that span 10 degrees  [0-10, 10-20, ...].
  A dew point of 15 degrees would be counted in the second bin (10-20).

  Questions we want to answer include
  + Do most days stay around the same level of humidity?
  + Are there two types of days - humid and dry?
  + Are there crazy humid days?
*/
async function drawBars() {
  // Access data
  const pathToJSON = './../data/seattle_wa_weather_data.json'
  const dataset = await d3.json(pathToJSON)

  // Create chart dimensions
  const width = 600 // We will be generating many of these, so let's keep our chart small

  let dimensions = {
    // NOTE: Histograms are easier to read when they are wider than they are tall
    width: width,
    height: width * 0.9,
    // Leave a larger margin on the top to account for the bar labels which will be positioned above each bar
    margin: {
      top: 30,
      right: 10,
      bottom: 50,
      left: 50,
    },
  }
  // Our wrapper encompasses the whole chart; we need to subtract our margins to determine our bounds
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom

  const drawHistogram = metric => {
    // For our histogram, we are only interested in one metric for the whole chart
    const metricAccessor = d => d[metric]
    const yAccessor = d => d.length

    // Draw canvas
    const wrapper = d3
      .select('#wrapper')
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)

    const bounds = wrapper
      .append('g')
      .style(
        'transform',
        `translate(${dimensions.margin.left}px, ${dimensions.margin.top})`
      )

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, metricAccessor))
      .range([0, dimensions.boundedWidth])
      .nice()

    // Wait a minute! We can't create our y scale without knowing the range of frequencies we need to cover.
    const binsGenerator = d3
      .histogram()
      .domain(xScale.domain())
      // How do we get the humidity value? We will use our metricAccessor
      .value(metricAccessor)
      // Let's aim to create 13 bins - which is the number of thresholds + 1
      .thresholds(12)
    // OPTIONAL: We could explicitly specify five bins with an array like
    // .thresholds([0, 0.2, 0.4, 0.6, 0.8, 1])

    // Create our bins
    const bins = binsGenerator(dataset)

    /*
    What's in a bin?

    Each bin is an array with
    + An item matching a data point
    + An x0 key showing the lower bound of the container (inclusive)
    + An x1 key showing the upper bound of the container (exclusive)
      - An x1 value of 1 will include values up to 1, but not 1 itself
  */

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, yAccessor)]) // We will never have negative days, so we can start at 0
      .range([dimensions.boundedHeight, 0])
      .nice()

    // Draw data - Create one bar for each bin, with a label on top of each bar
    const binsGroup = bounds.append('g') // Contains our bins
    const binGroups = binsGroup
      .selectAll('g')
      .data(bins) // Bind our bins to the selection
      // Create a new "g" element for each bin
      .enter()
      .append('g')

    // Draw our bars
    const barPadding = 1
    const barRects = binGroups
      .append('rect') // rect elements need x, y, width, and height attributes
      // x value corresponds to the left side of the bar and will start with the lower bound of the bin (x0)
      .attr('x', d => xScale(d.x0) + barPadding / 2)
      // y value corresponds to the top of the bar (using yScale to conver the frequency value into pixel space)
      .attr('y', d => yScale(yAccessor(d)))
      // To calculate the width of a bar, we need to subtract x0 from x1...then subtract bar padding and protect against a negative width
      .attr('width', d => d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding]))
      // Calculate bar height by subtracting the y value from the bottom of the y axis
      .attr('height', d => dimensions.boundedHeight - yScale(yAccessor(d)))
      // Since our y axis starts at 0, we can use our boundedHeight ^^^^^
      // Fill the bar with a blue color
      .attr('fill', 'cornflowerblue')

    // Add labels to bins with relevant days only; no need to call a 0 label - the bar will be empty
    const barText = binGroups
      .filter(yAccessor)
      .append('text')
      // Center the label horizontally above the bar
      .attr('x', d => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      // Shift text up by 5 pixels to add a little gap
      .attr('y', d => yScale(yAccessor(d)) - 5)
      .text(yAccessor)
      // Use text-anchor to horizontally align our text instead of compensating for width
      .style('text-anchor', 'middle')
      // Color and style
      .attr('fill', 'darkgrey')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')

    // Extra credit - Identify the mean
    const mean = d3.mean(dataset, metricAccessor)
    // Add a line to our bounds that draws a line between two points - (x1, y1) and (x2, y2)
    const meanLine = bounds
      .append('line')
      .attr('x1', xScale(mean))
      .attr('x2', xScale(mean))
      .attr('y1', 25)
      .attr('y2', dimensions.boundedHeight)
      // By default, lines have no stroke color - let's make ours dashed with a 2px maroon dash and 4px long gap
      .attr('stroke', 'maroon')
      .attr('stroke-dasharray', '2px 4px')
    const meanLabel = bounds
      .append('text')
      .attr('x', xScale(mean))
      .attr('y', 15)
      .text('mean')
      .attr('fill', 'maroon')
      .style('font-size', '12px')
      .style('text-anchor', 'middle')

    // Draw peripherals - No y-axis label needed since we have the label centered above each bar
    const xAxisGenerator = d3.axisBottom().scale(xScale)

    const xAxis = bounds
      .append('g')
      .call(xAxisGenerator)
      .style('transform', `translateY(${dimensions.boundedHeight}px)`)

    const xAxisLabel = xAxis
      .append('text')
      .attr('x', dimensions.boundedWidth / 2)
      .attr('y', dimensions.margin.bottom - 10)
      .attr('fill', 'black')
      .style('font-size', '1.4em')
      // Use the supplied metric for our text; however in most cases you'd perform a lookup in a proper map
      .text(metric)
      .style("text-transform", "capitalize")

    // Set up interactions
  }
  // TODO: Ready to identify metrics to draw histograms
  const metrics = [
    "windSpeed",
    "moonPhase",
    "dewPoint",
    "humidity",
    "uvIndex",
    "windBearing",
    "temperatureMin",
    "temperatureMax",
  ]

  // Draw a histogram for each metric
  metrics.forEach(drawHistogram)
}

drawBars()
