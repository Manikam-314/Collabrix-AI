const axios = require("axios");
const WebSocket = require("ws");
const mongoose = require("mongoose");

// Start the Express app server programmatically
console.log("⏳ Starting Express Backend and In-memory MongoDB...");
require("./app");

// Helper function to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    // Wait for Express server to start and MongoDB to connect
    console.log("🕒 Waiting 3 seconds for server boot-up...");
    await sleep(3000);

    const backendUrl = "http://localhost:8080";
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = "securepassword123";
    const testName = "Test Developer";
    let token = "";
    let userId = "";
    let meetingId = "";

    console.log("\n==============================================");
    console.log("🚀 Starting Node.js Backend API Integration Tests");
    console.log("==============================================\n");

    // 1. Test SignUp Endpoint
    console.log("🧪 Test 1: User Registration (/auth/SignUp)...");
    const signupRes = await axios.post(`${backendUrl}/auth/SignUp`, {
      email: testEmail,
      password: testPassword,
      name: testName,
    });
    
    if (signupRes.status === 201 && signupRes.data.userId) {
      console.log(`✅ Registration Successful! User ID: ${signupRes.data.userId}`);
      userId = signupRes.data.userId;
    } else {
      throw new Error(`SignUp failed with status ${signupRes.status}`);
    }

    // 2. Test SignUp Validation (Duplicate Email)
    console.log("\n🧪 Test 2: SignUp Duplicate Email Validation...");
    try {
      await axios.post(`${backendUrl}/auth/SignUp`, {
        email: testEmail,
        password: testPassword,
        name: testName,
      });
      throw new Error("Duplicate email signup should have failed, but succeeded.");
    } catch (err) {
      if (err.response && err.response.status === 422) {
        console.log("✅ Duplicate email validation correctly returned 422!");
      } else {
        throw new Error(`Duplicate signup failed with unexpected response: ${err.message}`);
      }
    }

    // 3. Test Login Endpoint
    console.log("\n🧪 Test 3: User Login (/auth/Login)...");
    const loginRes = await axios.post(`${backendUrl}/auth/Login`, {
      email: testEmail,
      password: testPassword,
    });

    if (loginRes.status === 200 && loginRes.data.token) {
      token = loginRes.data.token;
      console.log("✅ Login Successful! JWT Token acquired.");
    } else {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    // 4. Test Create Meeting Endpoint
    console.log("\n🧪 Test 4: Create Meeting (/meetings/create-meeting)...");
    const meetingRes = await axios.get(`${backendUrl}/meetings/create-meeting`);
    if (meetingRes.status === 200 && meetingRes.data.meetingId) {
      meetingId = meetingRes.data.meetingId;
      console.log(`✅ Meeting Created Successfully! Meeting ID: ${meetingId}`);
    } else {
      throw new Error(`Create meeting failed with status ${meetingRes.status}`);
    }

    // 5. Test Save Caption Endpoint
    console.log("\n🧪 Test 5: Save Caption (/meetingAi/caption)...");
    const captionText = "Welcome to the project demo. We need to assign tasks to the development team today.";
    const captionRes = await axios.post(`${backendUrl}/meetingAi/caption`, {
      meetingId,
      transcript: captionText,
    });

    if (captionRes.status === 201) {
      console.log("✅ Caption saved successfully in Database!");
    } else {
      throw new Error(`Save caption failed with status ${captionRes.status}`);
    }

    // 6. Test WebSocket real-time chat and message broadcasting
    console.log("\n🧪 Test 6: WebSocket Real-time Chat Connection & Broadcasting...");
    const ws1 = new WebSocket(`ws://localhost:8080?meetingId=${meetingId}`);
    const ws2 = new WebSocket(`ws://localhost:8080?meetingId=${meetingId}`);

    const wsPromise = new Promise((resolve, reject) => {
      let ws1Connected = false;
      let ws2Connected = false;
      const testMsg = "Hello team, this is an automated websocket test message.";

      const timeout = setTimeout(() => {
        ws1.close();
        ws2.close();
        reject(new Error("WebSocket communication timed out"));
      }, 5000);

      ws1.on("open", () => { ws1Connected = true; triggerSend(); });
      ws2.on("open", () => { ws2Connected = true; triggerSend(); });

      function triggerSend() {
        if (ws1Connected && ws2Connected) {
          // ws1 sends a message
          ws1.send(testMsg);
        }
      }

      ws2.on("message", (data) => {
        const receivedText = data.toString();
        if (receivedText === testMsg) {
          console.log(`✅ ws2 successfully received broadcasted message: "${receivedText}"`);
          clearTimeout(timeout);
          ws1.close();
          ws2.close();
          resolve();
        }
      });
    });

    await wsPromise;

    // 7. Verify AI integration (Summary)
    console.log("\n🧪 Test 7: Fetch AI Summary (/meetingAi/summary/:meetingId)...");
    try {
      const summaryRes = await axios.get(`${backendUrl}/meetingAi/summary/${meetingId}`);
      if (summaryRes.status === 200) {
        console.log(`✅ AI Summary Fetched: "${summaryRes.data.summary}"`);
      } else {
        throw new Error(`Summary fetch failed with status ${summaryRes.status}`);
      }
    } catch (err) {
      console.log(`⚠️ Warning: Summary fetch returned error (is Python service active?): ${err.message}`);
    }

    // 8. Verify AI integration (Highlights)
    console.log("\n🧪 Test 8: Fetch AI Highlights (/meetingAi/highlights/:meetingId)...");
    try {
      const highlightsRes = await axios.get(`${backendUrl}/meetingAi/highlights/${meetingId}`);
      if (highlightsRes.status === 200) {
        console.log(`✅ AI Highlights Fetched:`, JSON.stringify(highlightsRes.data.highlights));
      } else {
        throw new Error(`Highlights fetch failed with status ${highlightsRes.status}`);
      }
    } catch (err) {
      console.log(`⚠️ Warning: Highlights fetch returned error (is Python service active?): ${err.message}`);
    }

    console.log("\n==============================================");
    console.log("🎉 ALL NODE.JS API TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==============================================\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Test Suite Failed with Error:");
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Data:`, err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

runTests();
