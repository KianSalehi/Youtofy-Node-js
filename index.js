//Import youtube api, spotify api
const {google} = require('googleapis');
const {clientID,clientSecret} = require('./config.json');
const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');

const app = express();

//Main page

app.get('/',(req, res) => {
    res.sendFile(__dirname+"/"+"index.html");
});

//login for spotify

app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req,res)=>{
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }
    spotifyApi
        .authorizationCodeGrant(code)
        .then(data => {
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];
            const expires_in = data.body['expires_in'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            console.log('access_token:', access_token);
            console.log('refresh_token:', refresh_token);

            console.log(
                `Sucessfully retreived access token. Expires in ${expires_in} s.`
            );
            res.send('Success! You can now close the window.');

            setInterval(async () => {
                const data = await spotifyApi.refreshAccessToken();
                const access_token = data.body['access_token'];
                console.log('The access token has been refreshed!');
                console.log('access_token:', access_token);
                spotifyApi.setAccessToken(access_token);
            }, expires_in / 2 * 1000);
        })
        .catch(error => {
            console.error('Error getting Tokens:', error);
            res.send(`Error getting Tokens: ${error}`);
        });
});

//Page to store youtube URL
app.get('/YoutubeURLInfo', (req, res) => {
    // Prepare output in JSON format
    let youtubeURL = req.query.youtubeURL;
    let stringURL = youtubeURL.toString();
    let ID = stringURL.split("list=");
    ID = ID[1];
    ID=ID.split("&");
    ID=ID[0];
    let youtubeID = ID;
    res.redirect('/login');
    itemsFinder(youtube, youtubeID);
})

//spotify scopes
const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',

]

//Youtube api authentication
const youtube = google.youtube({
    version: 'v3',
    auth: ''
});
//Spotify API authentication
const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:8888/callback',
    clientId: clientID,
    clientSecret: clientSecret
});

//function to get the items in a youtube playlist
function itemsFinder(youtube, playlistID) {
    youtube.playlistItems.list({
        "part": [
            "snippet"
        ],
        "maxResults": 50,
        "playlistId": `${playlistID}`
    }).then(function (response) {
        let listOfSongs = response.data.items;
        let listOfNames = [];
        for (let i = 0; i < listOfSongs.length; i++) {
            if (listOfSongs[i].snippet.title.includes("(")){
                let songName= listOfSongs[i].snippet.title.split("(");
                if (songName[0].includes("ft.")){
                    let songNameWOFt=songName[0].split("ft.");
                    listOfNames[i]=songNameWOFt[0];
                }else{listOfNames[i] =songName[0];}
            }else if (listOfSongs[i].snippet.title.includes("[")){
                let songName= listOfSongs[i].snippet.title.split("[");
                if (songName[0].includes("ft.")){
                    let songNameWOFt=songName[0].split("ft.");
                    listOfNames[i]=songNameWOFt[0];
                }else{listOfNames[i] =songName[0];}
            }else if (listOfSongs[i].snippet.title.includes("{")){
                let songName= listOfSongs[i].snippet.title.split("{");
                if (songName[0].includes("ft.")){
                    let songNameWOFt=songName[0].split("ft.");
                    listOfNames[i]=songNameWOFt[0];
                }else{listOfNames[i] =songName[0];}
            }
            else{
                if (listOfSongs[i].snippet.title.includes("ft.")){
                    let songName= listOfSongs[i].snippet.title.split("ft.");
                    listOfNames[i] = songName[0];
                }
                else{
                    listOfNames[i] = listOfSongs[i].snippet.title;
                }
            }
        }
        youtube.playlists.list({
            "part": ["snippet"],
            "id":`${playlistID}`,
            "maxResults": 1,

        }).then(response=>{
            let nameOfThePlaylist = response.data.items[0].snippet.title;
            for (let i=0;i<listOfNames.length;i++){
                if (listOfNames[i]==""){
                    listOfNames.splice(i,1);
                }
            }
            console.log(nameOfThePlaylist);
            makeSpotifyPlaylist(spotifyApi, playlistName, NamesList);
            console.log(nameOfThePlaylist);
        }).catch(error=>{
            console.error(error);
        })

    }).catch(error => {
        console.error(error);
    });
}

//function to make a spotify playlist
function makeSpotifyPlaylist(spotifyApi, playlistName, SongNames){
    spotifyApi.createPlaylist(`${playlistName}`,{'description':'My description', 'public':true})
        .then(data=>{
            let playlistID= data.body.id;
            searchSong(spotifyApi, playlistID, SongNames);
            console.log('Created Playlist!');
        }, err=>{
            console.log('Something went wrong!', err)
        });
}

//function to search for the songs
function searchSong(spotifyApi, playlistID, songNames){
    let tracks = [];
    for (let i=0; i<songNames.length;i++){
        spotifyApi.searchTracks(`${songNames[i]}`)
            .then(data=>{
                if (data.body.tracks.items[0] != undefined){
                    tracks.push(data.body.tracks.items[0].uri);}
                if (i==(songNames.length-1)){
                    addSongsToSpotifyPlaylist(spotifyApi, playlistID, tracks);
                }
            }, err=>{
                console.error(err);
            })
    }

}

//function to add the songs to the playlist
function addSongsToSpotifyPlaylist(spotifyApi, playlistID, tracks){
    spotifyApi.addTracksToPlaylist(`${playlistID}`,tracks)
        .then(data=>{
            console.log('Added song to the playlist!');
        }), err=>{
        console.log('Something went wrong!', err);
    }


}

app.listen(8888, () =>
    console.log(
        'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
    )
);