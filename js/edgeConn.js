var diameter = 960,
    radius = diameter / 2,
    innerRadius = radius - 120;

var nodes, edgs;
var tld = [];
var gradientCounter = 0;
var body = d3.select("body");

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.85)
    .radius(function(d) { return d.y; })
    .angle(function(d) { return d.x / 180 * Math.PI; });

var svg = d3.select("#viz").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
    .append("g")
    .attr("transform", "translate(" + radius + "," + radius + ")");

var link = svg.append("g").selectAll(".link"),
    node = svg.append("g").selectAll(".node");

var getGradient = function (d) {
  var gradientId = "gradient" + gradientCounter;

  var gradient = svgDefs.append("svg:linearGradient")
    .attr("id", gradientId);

  gradient.append("svg:stop")
    .attr("offset", "10%")
    .attr("stop-color", getColor(d.source.path[0]));

  gradient.append("svg:stop")
    .attr("offset", "90%")
    .attr("stop-color", getColor(d.target.path[0]));

  gradientCounter++;
  return gradientId;
};

function visualize(edges, toUpdate) {
  var clubs = getClubNames(edges);
  var root = packagePlayers(edges);
  var links = packageEdges(root, edges);

  var numNodes = root.children.length;
  var bubbleRadius = 140 * numNodes / (2 * Math.PI);
  console.log(numNodes + " nodes --> " + bubbleRadius + "px radius");

  var cluster = d3.layout.cluster()
      .size([360, bubbleRadius])
      .sort(null)
      .value(function(d) { return d.size; });

  nodes = cluster.nodes(root);
  var splines = bundle(links);

  var getColor = d3.scale.ordinal().range(colorbrewer.Dark2[clubs.length])
    .domain(clubs);

  // data join
  var linkWithData = link
    .data(bundle(links));

  // enter
  linkWithData.enter().append("path")
    .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; });

  // update
  linkWithData.attr("class", "link")
    .attr("d", line);

  // enter + update

  // exit
  linkWithData.exit().remove();

//  link = link
//      .data(bundle(links))
//      .enter().append("path")
//      .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
//      .attr("class", "link")
//      .attr("d", line);

  // data join

  // update

  // enter

  // enter + update

  // exit
  svg.selectAll("g.node-dot")
    .data(nodes.filter(function(n) { return !n.children; }))
    .enter().append("svg:g")
    .attr("class", addTLDClass("node-dot"))
    .attr("id", function(d) { return "node-dot-" + d.key; })
    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x * 10 + ")"; })
    .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    .append("circle")
    .style("fill", function(d) { return getColor(d.clubName); })
    .attr("r", 5)
    .on("mouseover", mouseovered)
    .on("mouseout", mouseouted);

  // data join

  // update

  // enter

  // enter + update

  // exit
  node = node
      .data(nodes.filter(function(n) { return !n.children; }))
      .enter().append("text")
      .attr("class", addTLDClass("node"))
      .attr("dy", ".31em")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 15) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
      .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.key; })
      .on("mouseover", mouseovered)
      .on("mouseout", mouseouted);

  // change the tension of the line based on the value of tension control
  d3.select("#tensionControl").on("change", function() {
    line.tension(this.value / 100);
    link.attr("d", function(d, i) { return line(splines[i]); });
  });

  // show legends
  body.select("#legend")
    .selectAll("div")
    .data(clubs)
    .enter().append("li")
    .append("label")
      .attr('for', function(n) { return getCheckBoxId(n); })
      .text(function(n) { return n; })
      .style("display", "inline")
      .style("background-color", function (n) { return getColor(n); })
    .append("input")
      .attr("type", "checkbox")
      .attr("id", function(n) { return getCheckBoxId(n); })
      .property("checked", true)
      .attr("value", function (n) { return n; })
      .on("click", filterEdges);
}

d3.json("player.json", function(error, edges) {
  if (error) throw error;

  edgs = edges;
  visualize(edges, false);
});

function getNameWithoutBlanks (name) {
  return name.replace(" ", "");
}

function getCheckBoxId (name) {
  return getNameWithoutBlanks(name) + "CheckBox";
}

function tldClass (n) {
  while (n.depth > 1) {
    n = n.parent;
  }
  return "tld_" + tld.indexOf(n.key);
}

function addTLDClass (static) {
  return function(n) {
    while (n.depth > 1) {
      n = n.parent;
    }
    return static + " " + tldClass(n);
  }
}

function mouseovered(d) {
  node
      .each(function(n) { n.target = n.source = false; });

  link
      .classed("link--target", function(l) { if (l.target === d) return l.source.source = true; })
      .classed("link--source", function(l) { if (l.source === d) return l.target.target = true; })
      .filter(function(l) { return l.target === d || l.source === d; })
      .each(function() { this.parentNode.appendChild(this); });

  node
      .classed("node--target", function(n) { return n.target; })
      .classed("node--source", function(n) { return n.source; });
}

function mouseouted(d) {
  link
      .classed("link--target", false)
      .classed("link--source", false);

  node
      .classed("node--target", false)
      .classed("node--source", false);
}

function filterEdges() {
  var checkBoxes = body.select("#legend")
                        .selectAll("input")
                        .filter(function (n, i) {
                          var checked = d3.select("#" + getCheckBoxId(n)).property("checked");
                          return checked;
                        });
  
  var filteredClubNames = checkBoxes[0].map(function (checkbox) {
    return checkbox.__data__;
  });
  
  var removedClubNames = _.difference(getClubNames(edgs), filteredClubNames);
  
  var remaining = edgs.filter( function (n) {
    return removedClubNames.some(function (name) {
      return !(n.source.club.name === name || 
        n.target.club.name === name);
    });
  });
  
  remaining.forEach(function (c) {
    console.log("source: " + c.source.club.name);
    console.log("target: " + c.target.club.name);
  });
  
  visualize(remaining, true);
}

d3.select(self.frameElement).style("height", diameter + "px");

// Lazily construct the package hierarchy from edge (class) names.
function getNode(name, key) {
  return {name: name, key: key, children: []};
}

function getNodeWithChildren(name, key, children) {
  return {name: name, key: key, children: children};
}

function getSourceTargetClubNames(edge) {
  return [edge.source.club.name, edge.target.club.name];
}

function getClubNames(edges) {
  var arrayClubNames = _.map(edges, function(edge) {
    return getSourceTargetClubNames(edge);
  });

  return _.uniq(_.flatten(arrayClubNames));
}

function getSourceTargetPlayerNames(edge) {
  return [edge.source.name, edge.target.name];
}

function getPlayerNames (edges) {
  var arrayPlayerNames = _.map(edges, function(edge) {
    return getSourceTargetPlayerNames(edge);
  });

  return _.uniq(_.flatten(arrayPlayerNames));
}

function addPlayer(root, player, clubName) {
  var foundPlayer = root.children.find(function (d) {
    return d.name === player.name;
  });

  if (!foundPlayer) {
    var playerNode = getNode(player.name, player.name);
    playerNode.clubName = clubName;
    root.children.push(playerNode);
  }
}

function packagePlayers(edges) {
  var root = getNode("", "");
  var playerNames = getPlayerNames(edges);

  if (edges) {
    edges.forEach(function(c) {
      addPlayer(root, c.source, c.source.club.name);
      addPlayer(root, c.target, c.target.club.name);
    });
  }

  var sorted = _.sortBy(root.children, function (a) {
    return a.clubName;
  });

  return getNodeWithChildren("", "", sorted);
}

// Return a list of edges for the given array of nodes.
function packageEdges(root, edges) {
  var imports = [];

  edges.forEach(function (c) {
    var source = _.find(root.children, function (player) {
      return player.name === c.source.name;
    });

    var target = _.find(root.children, function (player) {
      return player.name === c.target.name;
    });

    imports.push({source: source, target: target});
  });

  return imports;
}
