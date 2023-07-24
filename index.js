const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' });
        }

        req.decoded = decoded;
        next();
    });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.59h5qtx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const usersCollection = client.db("eCollegeEnrollDB").collection("users");
        const collegeCollection = client.db("eCollegeEnrollDB").collection("colleges");
        const applicationCollection = client.db("eCollegeEnrollDB").collection("applications");
        const reviewCollection = client.db("eCollegeEnrollDB").collection("reviews");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // user related apis 
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // college related apis 
        app.get('/colleges', async (req, res) => {
            const search = req.query.search || '';
            const query = { collegeName: { $regex: search, $options: 'i' } }
            const result = await collegeCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/college/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await collegeCollection.findOne(query);
            res.send(result);
        });

        // application related apis
        app.get('/applications', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }

            const query = { canEmail: email };
            const result = await applicationCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/application/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await applicationCollection.findOne(query);
            res.send(result);
        });

        app.post('/applications', verifyJWT, async (req, res) => {
            const application = req.body;
            const result = await applicationCollection.insertOne(application);
            res.send(result);
        });

        app.put('/application/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const document = req.body;
            const updateDoc = {
                $set: {
                    phone: document.phone,
                    dob: document.dob
                }
            };

            const result = await applicationCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/application/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await applicationCollection.deleteOne(query);
            res.send(result);
        });

        // review related apis
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });

        app.post('/review', verifyJWT, async (req, res) => {
            const collegeReview = req.body;
            const result = await reviewCollection.insertOne(collegeReview);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('eCollege Server is running..');
});

app.listen(port, () => {
    console.log(`eCollege is running on port ${port}`);
});