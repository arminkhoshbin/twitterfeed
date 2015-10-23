var chart;
var options;
var chartData;
var content = $("#content");
var updateTimeout;
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
        },
        complete: function() {
          getUpdates();
        },

  });
  e.preventDefault();
});

$('#refresh').click(function(e) {
  $.ajax({
    url: '/update', 
    success: function(data) {
      if(data.sentiment) {
        chartData = [['Type', 'Positive', 'Negative', 'Neutral'],
                    [' ', data.sentiment.positive,
                    data.sentiment.negative,
                    data.sentiment.netural]
                  ];
        drawChart();
      }
      if(data.tweets) {
        data.tweets.forEach(function(tweet) {
          var newTweet = '<li class="new"><img src="' + tweet.profile + '"><span class="tweet">' + tweet.text + '</span></li>';
          $('#content ul').prepend(newTweet);
        });
      }
    },
  });
  e.preventDefault();
});

$('#stop').click(function(e) {
  if(updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = 0;
  }
  $.ajax({
    url: '/stop', 
    success: function(data) {
    },
  });
  e.preventDefault();
});


function getUpdates() {
  $.ajax({
    url: '/update', 
    success: function(data) {
      if(data.sentiment) {
        chartData = [['Type', 'Positive', 'Negative', 'Neutral'],
                    [' ', data.sentiment.positive,
                    data.sentiment.negative,
                    data.sentiment.netural]
                  ];
        drawChart();
      }
      if(data.tweets) {
        $('#content ul').html('');
        data.tweets.forEach(function(tweet) {
          var newTweet = '<li class="new"><img src="' + tweet.profile + '"><span class="tweet">' + tweet.text + '</span></li>';
          $('#content ul').prepend(newTweet);
        });
      }
    },
    complete: function() {
      // Schedule the next request when the current one's complete
      updateTimeout = setTimeout(getUpdates, 1000);
    }
  });
}

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