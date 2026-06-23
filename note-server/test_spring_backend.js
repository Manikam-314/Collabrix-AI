const axios = require("axios");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  try {
    const backendUrl = "http://localhost:8080";
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = "securepassword123";
    const testName = "Test Developer";
    let token = "";
    let userId = "";
    let meetingId = "";

    console.log("\n=======================================================");
    console.log("🚀 Starting Spring Boot Backend API Integration Tests");
    console.log("=======================================================\n");

    // 1. Test SignUp Endpoint
    console.log("🧪 Test 1: User Registration (/auth/SignUp)...");
    const signupRes = await axios.post(`${backendUrl}/auth/SignUp`, {
      email: testEmail,
      password: testPassword,
      name: testName,
    });
    
    if (signupRes.status === 200) {
      console.log(`✅ Registration Successful! Response: ${JSON.stringify(signupRes.data)}`);
    } else {
      throw new Error(`SignUp failed with status ${signupRes.status}`);
    }

    // 2. Test Login Endpoint
    console.log("\n🧪 Test 2: User Login (/auth/Login)...");
    const loginRes = await axios.post(`${backendUrl}/auth/Login`, {
      email: testEmail,
      password: testPassword,
    });

    if (loginRes.status === 200 && loginRes.data.token) {
      token = loginRes.data.token;
      userId = loginRes.data.userId;
      console.log(`✅ Login Successful! JWT Token acquired. UserID: ${userId}`);
    } else {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    // 3. Test Create Meeting Endpoint (Authenticated)
    console.log("\n🧪 Test 3: Create Meeting (/meetings/create-meeting)...");
    const meetingRes = await axios.get(`${backendUrl}/meetings/create-meeting`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (meetingRes.status === 200 && meetingRes.data.meetingId) {
      meetingId = meetingRes.data.meetingId;
      console.log(`✅ Meeting Created Successfully! Meeting ID: ${meetingId}`);
    } else {
      throw new Error(`Create meeting failed with status ${meetingRes.status}`);
    }

    // 4. Test Save Caption Endpoint (Flexible Payload: sends 'transcript', no 'timestamp')
    console.log("\n🧪 Test 4: Save Caption (/meetingAi/caption)...");
    const captions = [
      "Hello team, today we need to discuss the new feature implementation and assign tasks.",
      "Madesh will complete the database schema setup by tomorrow.",
      "We also have a deadline for the API integration which is due next Friday.",
      "Let's schedule a follow-up review session next Monday to verify progress."
    ];

    for (const c of captions) {
      const captionRes = await axios.post(`${backendUrl}/meetingAi/caption`, {
        meetingId,
        transcript: c, // sends 'transcript' like the frontend!
      });
      if (captionRes.status === 200) {
        console.log(`✅ Caption saved successfully: "${c}"`);
      } else {
        throw new Error(`Save caption failed with status ${captionRes.status}`);
      }
    }

    // Wait a brief moment to make sure DB entries are fully committed
    await sleep(1000);

    // 5. Verify AI integration (Summary - connects Spring to Python)
    console.log("\n🧪 Test 5: Fetch AI Summary (/meetingAi/summary/:meetingId)...");
    const summaryRes = await axios.get(`${backendUrl}/meetingAi/summary/${meetingId}`);
    if (summaryRes.status === 200) {
      console.log(`✅ AI Summary Fetched: "${summaryRes.data.summary}"`);
    } else {
      throw new Error(`Summary fetch failed with status ${summaryRes.status}`);
    }

    // 6. Verify AI integration (Highlights - connects Spring to Python)
    console.log("\n🧪 Test 6: Fetch AI Highlights (/meetingAi/highlights/:meetingId)...");
    const highlightsRes = await axios.get(`${backendUrl}/meetingAi/highlights/${meetingId}`);
    if (highlightsRes.status === 200) {
      console.log(`✅ AI Highlights Fetched:`, JSON.stringify(highlightsRes.data.highlights));
    } else {
      throw new Error(`Highlights fetch failed with status ${highlightsRes.status}`);
    }

    console.log("\n=======================================================");
    console.log("🎉 ALL SPRING BOOT BACKEND API TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("=======================================================\n");
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
