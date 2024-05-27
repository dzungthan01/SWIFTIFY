const mysql = require('mysql')
const config = require('./config.json')

// Creates MySQL connection using database credential provided in config.json
const connection = mysql.createConnection({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db
});
connection.connect((err) => err && console.log(err));

/******************
 * WARM UP ROUTES *
 ******************/

// Route 1: GET /author/:type
const author = async function(req, res) {
  const name = 'Dzung Than';
  const pennKey = 'dthan';

  if (req.params.type === 'name') {
    res.send(`Created by ${name}`);
  } else if (req.params.type == 'pennkey') {
    res.send(`Created by ${pennKey}`);
  } else {
    res.status(400).send(`'${req.params.type}' is not a valid author type. Valid types are 'name' and 'pennkey'.`);
  }
}

// Route 2: GET /random
const random = async function(req, res) {
  const explicit = req.query.explicit === 'true' ? 1 : 0;

  connection.query(`
    SELECT *
    FROM Songs
    WHERE explicit <= ${explicit}
    ORDER BY RAND()
    LIMIT 1
  `, (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json({
        song_id: data[0].song_id,
        title: data[0].title
      });
    }
  });
}

/********************************
 * BASIC SONG/ALBUM INFO ROUTES *
 ********************************/

// Route 3: GET /song/:song_id
const song = async function(req, res) {
  const song_id = req.params.song_id;
  connection.query(`
    SELECT *
    FROM Songs
    WHERE song_id = '${song_id}'
    LIMIT 1
  `, (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json(data[0]);
    }
  });
}

// Route 4: GET /album/:album_id
const album = async function(req, res) {
  const album_id = req.params.album_id;
  connection.query(`
    SELECT *
    FROM Albums
    WHERE album_id = '${album_id}'
    LIMIT 1
  `, (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json(data[0]);
    }
  }); 
}

// Route 5: GET /albums
const albums = async function(req, res) {
  connection.query(`
    SELECT *
    FROM Albums
    ORDER BY release_date DESC
  `, (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json(data);
    }
  }); 
  
}

// Route 6: GET /album_songs/:album_id
const album_songs = async function(req, res) {
  const album_id = req.params.album_id;

  connection.query(`
    SELECT song_id, title, number, duration, plays
    FROM Songs
    WHERE album_id = '${album_id}'
    ORDER BY number
  `, (err, data) => {
    if (err || data.length === 0) {
      console.log(err);
      res.json({});
    } else {
      res.json(data);
    }
  }); 
}

/************************
 * ADVANCED INFO ROUTES *
 ************************/

// Route 7: GET /top_songs
const top_songs = async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.page_size ?? 10;

  const start = (page - 1) * pageSize;


  if (!page) {
    connection.query(`
      SELECT S.song_id AS song_id, S.title AS title, S.album_id AS album_id, A.title AS album, S.plays AS plays
      FROM Songs S JOIN Albums A on S.album_id = A.album_id
      ORDER BY S.plays DESC
    `, (err, data) => {
      if (err || data.length === 0) {
        console.log(err);
        res.json({});
      } else {
        res.json(data);
      }
    });
  } else {

    connection.query(`
      SELECT S.song_id AS song_id, S.title AS title, S.album_id AS album_id, A.title AS album, S.plays AS plays
      FROM Songs S JOIN Albums A on S.album_id = A.album_id
      ORDER BY S.plays DESC
      LIMIT ${pageSize} OFFSET ${start}
    `, (err, data) => {
      if (err || data.length === 0) {
        console.log(err);
        res.json({});
      } else {
        res.json(data);
      }
    });
  }
}

// Route 8: GET /top_albums
const top_albums = async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.page_size ?? 10;

  let start = (page - 1) * pageSize;


  if (!page) {
    connection.query(`
      SELECT A.album_id, A.title as title, SUM(S.plays) as plays
      FROM Albums A JOIN Songs S ON A.album_id = S.album_id
      GROUP BY A.title
      ORDER BY SUM(S.plays) DESC
    `, (err, data) => {
      if (err || data.length === 0) {
        console.log(err);
        res.json({});
      } else {
        res.json(data);
      }
    });
  } else {

    connection.query(`
      SELECT A.album_id, A.title as title, SUM(S.plays) as plays
      FROM Albums A JOIN Songs S ON A.album_id = S.album_id
      GROUP BY A.title
      ORDER BY SUM(S.plays) DESC
      LIMIT ${pageSize} OFFSET ${start}
    `, (err, data) => {
      if (err || data.length === 0) {
        console.log(err);
        res.json({});
      } else {
        res.json(data);
      }
    });
  }
}

// Route 9: GET /search_albums
const search_songs = async function(req, res) {
  const title = req.query.title ?? '';
  const durationLow = req.query.duration_low ?? 60;
  const durationHigh = req.query.duration_high ?? 660;

  const plays_low = req.query.plays_low ?? 0;
  const plays_high = req.query.plays_high ?? 1100000000;
  const danceability_low = req.query.danceability_low ?? 0;
  const danceability_high = req.query.danceability_high ?? 1;
  const energy_low = req.query.energy_low ?? 0;
  const energy_high = req.query.energy_high ?? 1;
  const valence_low = req.query.valence_low ?? 0;
  const valence_high = req.query.valence_high ?? 1;
  const explicit = req.query.explicit === 'true' ? 1 : 0;

  connection.query(`
      SELECT *
      FROM Songs
      WHERE title LIKE '%${title}%'
      AND explicit <= ${explicit}
      AND duration >= ${durationLow} AND duration <= ${durationHigh}
      AND plays >= ${plays_low} AND plays <= ${plays_high}
      AND danceability >= ${danceability_low} AND danceability <= ${danceability_high}
      AND energy >= ${energy_low} AND energy <= ${energy_high}
      AND valence >= ${valence_low} AND valence <= ${valence_high}
      ORDER BY title
    `, (err, data) => {
      if (err || data.length === 0) {
        console.log(err);
        res.json({});
      } else {
        res.json(data);
      }
    });
}

module.exports = {
  author,
  random,
  song,
  album,
  albums,
  album_songs,
  top_songs,
  top_albums,
  search_songs,
}
