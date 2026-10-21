const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

exports.approvePayment = functions.https.onRequest((req, res) => {
  // यह आपके TrebEdit वाले CORS एरर को भी ठीक कर देगा
  return cors(req, res, async () => {
    try {
      // 1. ऐप से भेजी जा रही पेमेंट आईडी को प्राप्त करना
      const { paymentId } = req.body;

      if (!paymentId) {
        return res.status(400).send({ 
          success: false, 
          message: "Payment ID is missing in request body." 
        });
      }

      // 2. Firestore में संबंधित पेमेंट का स्टेटस 'Approved' करना
      await admin.firestore()
        .collection("payments")
        .doc(paymentId)
        .update({
          status: "Approved",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // 3. सफलतापूर्वक अप्रूव होने का रिस्पॉन्स भेजना
      return res.status(200).send({ 
        success: true, 
        message: "Payment successfully approved!" 
      });

    } catch (error) {
      // अगर सर्वर में कोई दिक्कत आती है तो एरर लॉग करना
      console.error("Internal Error Details:", error);
      return res.status(500).send({ 
        success: false, 
        error: error.message 
      });
    }
  });
});
