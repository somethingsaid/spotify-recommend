var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();
app.use(express.static('public'));

// Function to call Spotify API
var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

// Function for getting top tracks:
var getTopTracks = function(artist, cb) {
    unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/top-tracks?country=US')
        .end(function(response) {
           if (!response.error) {
               artist.tracks = response.body.tracks;
               cb();
           } else {
               cb(response.error);
           }
        });
};

// Creating endpoints with express
app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        
        // Getting related artists info
        var relatedSearchReq = getFromApi('artists/' + artist.id + '/related-artists/');
        relatedSearchReq.on('end', function(item) {
            artist.related = item.artists;
            var relatedArtistsCount = artist.related.length;
            var curr = 0;
            
            var checkComplete = function() {
                if (curr === relatedArtistsCount) {
                     res.json(artist);
                }
            };
            
            artist.related.forEach(function(artist) {
                getTopTracks(artist, function(err) {
                    if (err) {
                        res.sendStatus(404);
                        
                    }
                    curr += 1;
                    checkComplete();
                    
                });
                
            });
          });
        
        relatedSearchReq.on('error', function(code) {
            res.sendStatus(code);
        });
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(8080);