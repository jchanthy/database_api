import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas!');
    } catch (err) {
        console.error('Error connecting to MongoDB Atlas:', err);
    }
}

connectToDatabase();

const db = client.db('sample_mflix');
const moviesCollection = db.collection('movies');

// Route: /movie (GET) - Get a single movie by ID
app.get('/movie', async (req, res) => {
    try {
        const movieId = new ObjectId(req.query.id);
        const movie = await moviesCollection.findOne({ _id: movieId }, {
            projection: { _id: 1, title: 1, plot: 1, genres: 1, runtime: 1, rated: 1, year: 1 }
        });
        if (movie) {
            res.json(movie);
        } else {
            res.status(404).send('Movie not found');
        }
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

// Route: /movie (POST) - Create a new movie
app.post('/movie', async (req, res) => {
    try {
        const newMovie = {
            title: req.body.title,
            plot: req.body.plot,
            genres: req.body.genres,
            runtime: parseInt(req.body.runtime),
            rated: req.body.rated,
            year: parseInt(req.body.year)
        };

        const result = await moviesCollection.insertOne(newMovie);
        res.send(`Success! Created document with _id: ${result.insertedId}`);
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

// Route: /movie (PUT) - Update a movie by ID
app.put('/movie', async (req, res) => {
    try {
        const movieId = new ObjectId(req.query.id);
        const updatedMovie = {
            title: req.body.title,
            plot: req.body.plot,
            genres: req.body.genres,
            runtime: parseInt(req.body.runtime),
            rated: req.body.rated,
            year: parseInt(req.body.year)
        };

        const result = await moviesCollection.updateOne({ _id: movieId }, { $set: updatedMovie });
        if (result.modifiedCount > 0) {
            res.send('Success! Updated document.');
        } else {
            res.status(404).send('Movie not found');
        }
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

// Route: /movie (DELETE) - Delete a movie by ID
app.delete('/movie', async (req, res) => {
    try {
        const movieId = new ObjectId(req.query.id);
        const result = await moviesCollection.deleteOne({ _id: movieId });
        if (result.deletedCount > 0) {
            res.send('Success! Deleted document.');
        } else {
            res.status(404).send('Movie not found');
        }
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

// Route: /genres (GET) - Get all unique genres
app.get('/genres', async (req, res) => {
    try {
        const genres = await moviesCollection.distinct('genres');
        res.json(genres.flat()); // Flatten the array of arrays
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

// Route: /movies (GET) - Get a list of movies with filtering and pagination
app.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const moviesPerPage = parseInt(req.query.moviesPerPage) || 10;
        const skip = (page - 1) * moviesPerPage;

        let filter = {};
        if (req.query.title) {
            filter.title = req.query.title;
        } else if (req.query.plot) {
            filter.plot = { $regex: req.query.plot, $options: 'i' }; // Case-insensitive search
        } else if (req.query.year) {
            filter.year = parseInt(req.query.year);
        } else if (req.query.genre) {
            filter.genres = req.query.genre;
        }

        const movies = await moviesCollection.find(filter, {
            projection: { _id: 1, title: 1, plot: 1, genres: 1, runtime: 1, rated: 1, year: 1 }
        })
            .skip(skip)
            .limit(moviesPerPage)
            .toArray();

        res.json(movies);
    } catch (err) {
        res.status(500).send('Internal server error');
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});