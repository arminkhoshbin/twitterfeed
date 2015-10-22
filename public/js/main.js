var chart;
var options;
var socket = io.connect(window.location.hostname + ':3000');
var messages = [];
var chartData;
var content = $("#content");
socket.on('newTweet', function (data) {
  if(data.text) {
    messages.unshift(data.text);
    var newTweet = '<li class="new"><img src="' + data.user.profile_image_url_https + '"><span class="tweet">' + data.text + '</span></li>';
    $('#content ul').prepend(newTweet);
  } else {
    console.log("There is a problem:", data);
    }
});

socket.on('sentiment', function (data) {
  if(data) {
    chartData = [['Type', 'Positive', 'Negative', 'Neutral'],
                  [' ', data.positive,
                  data.negative,
                  data.netural]
                ];
    drawChart();
  } else {
    console.log("There is a problem:", data);
    }
});

$('#filterForm').submit(function(e) {
  var values = $('#filterForm').serialize();
  $.ajax({
        url: "/query",
        type: "post",
        data: values ,
        success: function (response) {               

        },
        error: function(jqXHR, textStatus, errorThrown) {
           console.log(textStatus, errorThrown);
        }

  });
  e.preventDefault();
});

$('#refresh').click(function(e) {
  socket.emit('refresh', {});
  e.preventDefault();
});

google.setOnLoadCallback(init);

function init() {
  chart = new google.charts.Bar(document.getElementById('sentimentChart'));
  var data = google.visualization.arrayToDataTable([['Type', 'Positive', 'Negative', 'Neutral'],
                  [' ', 0, 0, 0]
                ]);
  options = {
    chart: {
      title: 'Twitter Sentiment',
    },
    bars: 'horizontal', // Required for Material Bar Charts.
    colors: ['#1b9e77', '#d95f02', '#F4B40A'],
    axes: {
      x: {
        0: { side: 'bottom', label: 'Tweet Count'} // Top x-axis.
      }
    },
  };

  chart.draw(data, options);
}

function drawChart() {
  var data = google.visualization.arrayToDataTable(chartData);

  chart.draw(data, google.charts.Bar.convertOptions(options));
}