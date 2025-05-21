// tests/full.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.models.js';

// Define test users using your provided registered details.
const TEST_USERS = [
  {
    username: "user1",
    email: "user1@gmail.com",
    password: "Abcd@123",
    fullName: "User1 Test",   // Required field per your schema
    id: "614c69b75c21897da8f96961" // Fixed _id for consistency in tests
  },
  {
    username: "user2",
    email: "user2@gmail.com",
    password: "Abcd@123",
    fullName: "User2 Test",
    id: "614c69b75c21897da8f96962"
  }
];

let tokens = {};      // To store access tokens after login.
let meetingData = {}; // To store meeting details (meetingCode and roomId).

beforeAll(async () => {
  // Connect to your MongoDB test database.
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Ensure the test users exist (with fullName, etc.) and log them in.
  for (const user of TEST_USERS) {
    let existingUser = await User.findOne({ email: user.email });
    if (!existingUser) {
      const newUser = new User({
        _id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        password: user.password // Assume pre-save hook hashes the password
      });
      await newUser.save();
    }
    // Log in the user and store the access token.
    const loginResponse = await request(app)
      .post('/api/v1/users/login')
      .send({ username: user.username, password: user.password });
    expect(loginResponse.statusCode).toBe(200);
    tokens[user.username] = loginResponse.body.data.accessToken;
  }
});

afterAll(async () => {
  // Optionally perform any cleanup and then close the connection.
  await mongoose.connection.close();
});

describe("Meeting & Messaging Flow", () => {
  test("User 1 should create a meeting", async () => {
    const response = await request(app)
      .post('/api/v1/meeting/create')
      .set('Authorization', `Bearer ${tokens.user1}`)
      .send({ startTime: new Date().toISOString() });
    expect(response.statusCode).toBe(201);
    expect(response.body.data).toHaveProperty("meetingCode");
    expect(response.body.data).toHaveProperty("roomId");
    
    // Save the meeting details for further tests.
    meetingData = response.body.data;
  });

  test("User 2 should join the meeting", async () => {
    const response = await request(app)
      .post('/api/v1/meeting/join')
      .set('Authorization', `Bearer ${tokens.user2}`)
      .send({ meetingCode: meetingData.meetingCode });
    expect(response.statusCode).toBe(200);
    // Verify that User 2 (by _id) appears among the participants.
    expect(response.body.data.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user: TEST_USERS[1].id })
      ])
    );
  });

  test("Messaging: User 1 posts a message and User 2 can retrieve it", async () => {
    // Have User 1 post a message via the messaging HTTP endpoint.
    const messagePayload = { text: "Hello, user2!" };
    const postMsgResponse = await request(app)
      .post(`/api/v1/meeting/${meetingData.roomId}/message`)
      .set('Authorization', `Bearer ${tokens.user1}`)
      .send(messagePayload);
    // Expect 201 Created for posting a new message.
    expect(postMsgResponse.statusCode).toBe(201);
    
    // Now, using User 2's token, retrieve the messages from the room.
    const getMsgResponse = await request(app)
      .get(`/api/v1/meeting/${meetingData.roomId}/messages`)
      .set('Authorization', `Bearer ${tokens.user2}`);
    expect(getMsgResponse.statusCode).toBe(200);
    
    // Verify that the posted message appears in the retrieved messages.
    const messages = getMsgResponse.body.data;
    const matchingMessage = messages.find((msg) => msg.text === "Hello, user2!");
    expect(matchingMessage).toBeDefined();
  });

  test("Users should leave the meeting", async () => {
    // Leave the meeting using the leave endpoint as defined by your routes.
    const leaveResponse1 = await request(app)
      .post(`/api/v1/meeting/leave/${meetingData.roomId}`)
      .set('Authorization', `Bearer ${tokens.user1}`);
    expect(leaveResponse1.statusCode).toBe(200);

    const leaveResponse2 = await request(app)
      .post(`/api/v1/meeting/leave/${meetingData.roomId}`)
      .set('Authorization', `Bearer ${tokens.user2}`);
    expect(leaveResponse2.statusCode).toBe(200);
  });
});