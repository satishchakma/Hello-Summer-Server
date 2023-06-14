const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");

// middleswares

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Hello Summer server is running!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tgn2qtt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const userCollection = client.db("helloSummerDB").collection("users");
    const classCollection = client.db("helloSummerDB").collection("classes");
    const selectedClassCollection = client
      .db("helloSummerDB")
      .collection("selectedClass");

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "access forbidden" });
      }
      next();
    };

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const newUsers = req.body;
      console.log(newUsers);
      const query = { email: newUsers.email };
      const userExist = await userCollection.findOne(query);
      if (userExist) {
        return res.send({ message: "user already exists" });
      }

      const result = await userCollection.insertOne(newUsers);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const cursor = classCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // this option instructs the method to create a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get("/users/instructors/:email", async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ instructor: false });
      // }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // this option instructs the method to create a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const newclass = req.body;
      console.log(newclass);

      const result = await classCollection.insertOne(newclass);
      res.send(result);
    });
    app.get("/classes/:email", async (req, res) => {
      console.log(req.params.email);
      const userMail = req.params.email;
      const query = {
        instructorEmail: userMail,
      };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // this option instructs the method to create a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.patch("/classes/deny/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // this option instructs the method to create a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.post("/selectedClass", async (req, res) => {
      const selectedClass = req.body;
      const { _id, student } = req.body;

      const findCourse = await selectedClassCollection.findOne({ _id });

      if (!findCourse) {
        const result = await selectedClassCollection.insertOne(selectedClass);
        res.send(result);
      } else {
        const findUser = await selectedClassCollection.findOne({
          _id,
          student: { $in: student },
        });

        if (findUser) {
          res
            .status(400)
            .json({ message: "User has already selected the class." });
        } else {
          const result = await selectedClassCollection.updateOne(
            { _id },
            { $push: { student: student[0] } }
          );
          res.send(result);
        }
      }
    });

    app.get("/selectedClass/:email", async (req, res) => {
      const email = req.params.email;
      const query = { student: { $in: [email] } };

      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/selectedClass/:id/:email", async (req, res) => {
      const courseId = req.params.id;
      const studentEmail = req.params.email;

      try {
        const result = await selectedClassCollection.updateOne(
          { _id: courseId },
          { $pull: { student: studentEmail } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: "Error deleting the class" });
      }
    });

    app.patch("/classes/feedback/:id", async (req, res) => {
      const classId = req.params.id;
      const feedback = req.body.feedback;

      const id = req.params.id;
      const filter = { _id: new ObjectId(classId) };
      // this option instructs the method to create a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
