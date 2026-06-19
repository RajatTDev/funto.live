const Wallet = require("./server/wallet/wallet.model");
const User = require("./server/user/user.model");
const Follower = require("./server/follower/follower.model");
const LiveUser = require("./server/liveUser/liveUser.model");
const Chat = require("./server/chat/chat.model");
const ChatTopic = require("./server/chatTopic/chatTopic.model");
const LiveStreamingHistory = require("./server/liveStreamingHistory/liveStreamingHistory.model");
const PkGiftHistory = require("./server/pkGiftHistory/pkGiftHistory.model");
const Agency = require("./server/agency/agency.model");
const Bd = require("./server/bd/bd.model");
const FansRanking = require("./server/fansRanking/fansRanking.model");
const Setting = require("./server/setting/setting.model");
const Gift = require("./server/gift/gift.model");

const moment = require("moment");
const mongoose = require("mongoose");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const { offlineUser } = require("./server/user/user.controller");

//defaultSeats
const { default: defaultSeats } = require("./util/defaultUpdatedSeat");

//private key
const admin = require("./util/privateKey");

const getOrCreateChatTopic = async (senderId, receiverId) => {
  let topic = await ChatTopic.findOne({
    $or: [
      { senderUser: senderId, receiverUser: receiverId },
      { senderUser: receiverId, receiverUser: senderId },
    ],
  });

  if (!topic) {
    topic = new ChatTopic({
      senderUser: senderId,
      receiverUser: receiverId,
    });
    await topic.save();
  }

  return topic;
};

const formatDuration = (seconds) => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

//socket io
io.on("connect", async (socket) => {
  console.log("Connection done");
  console.log("socket.id : ", socket.id);

  const { globalRoom } = socket.handshake.query;
  console.log("globalRoom connected: ", globalRoom);

  const id = globalRoom && globalRoom.split(":")[1];
  console.log("id: ", id);

  socket.join(globalRoom);

  //live streaming
  socket.on("liveRoomConnect", async (data) => {
    console.log("liveRoomConnect connected: ============", data);

    socket.join(data.liveStreamingId);
    io.in(data.liveStreamingId).emit("liveRoomConnect", data);
  });

  socket.on("hostJoinAudioRoom", async (data) => {
    console.log("🎙️ Host Entered the Audio Room: ============", data);

    socket.join(data.liveStreamingId);
    io.in(data.liveStreamingId).emit("hostJoinAudioRoom", data);

    const liveUserObj = await LiveUser.findOneAndUpdate(
      {
        liveStreamingId: data.liveStreamingId,
        liveUserId: data.liveUserId,
      },
      { isHostExists: true },
      { new: true },
    );

    if (liveUserObj) {
      setTimeout(() => {
        socket.emit("view", liveUserObj?.view, data);
        io.in(data.liveStreamingId).emit(
          "seat",
          {
            ...liveUserObj?._doc,
            view: liveUserObj.view?.length,
          },
          null,
        );
      }, 1500);
    }

    const filteredViewers = liveUserObj?.view?.filter((user) => user.isAdd === true);
    console.log("filteredViewers ====================", filteredViewers);

    if (filteredViewers?.length > 0) {
      for (const viewer of filteredViewers) {
        if (viewer.fcmToken !== null && viewer.notification === true) {
          const adminPromise = await admin;

          const payload = {
            token: viewer.fcmToken,
            notification: {
              title: "Live Room Update 🎙️🔥",
              body: `🎤🔥 The host has just entered the audio room! Get ready for an amazing session! 🚀🎶`,
            },
            data: {
              data: JSON.stringify({
                time: "Just Now",
              }),
              type: "HOST_ENTERED",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log(`✅ Successfully sent to ${viewer.fcmToken}:`, response);
            })
            .catch((error) => {
              console.log(`❌ Error sending message to ${viewer.fcmToken}:`, error);
            });
        }
      }
    }
  });

  socket.on("liveRejoin", async (data) => {
    console.log("liveRejoin connected:   ", data);
    socket.join(data.liveStreamingId);
  });

  socket.on("liveStreaming", (data) => {
    console.log("liveStreaming data: ", data);

    io.in(data.liveRoom).emit("liveStreaming", data);
  });

  socket.on("simpleFilter", (data) => {
    console.log("simpleFilter data: ", data);

    socket.join(data.liveStreamingId);
    io.in(data.liveStreamingId).emit("simpleFilter", data);
  });

  socket.on("animatedFilter", (data) => {
    console.log("animatedFilter data: ", data);

    socket.join(data.liveStreamingId);
    io.in(data.liveStreamingId).emit("animatedFilter", data);
  });

  socket.on("gif", (data) => {
    console.log("gif data: ", data);

    io.in(data.liveRoom).emit("gif", data);
  });

  socket.on("comment", async (data) => {
    console.log("comment data:  ", data);
    socket.join(data.liveStreamingId);

    const liveStreamingHistory = await LiveStreamingHistory.findById(data.liveStreamingId);
    if (liveStreamingHistory) {
      liveStreamingHistory.comments += 1;
      await liveStreamingHistory.save();
    }

    io.in(data.liveStreamingId).emit("comment", data);

    if (data.isPkRunning) {
      const liveUser = await LiveUser.findById(data.liveUserId);
      if (liveUser) {
        console.log("INNER =============="); //if in pk Mode

        io.in(liveUser.pkConfig.host2LiveId).emit("comment", data);
      }
    }
  });

  socket.on("commentAudio", async (data_) => {
    console.log("commentAudio data:  ", data_);

    const data = JSON.parse(data_);

    const sockets = await io.in("globalRoom:" + data?.user?._id).fetchSockets();
    sockets?.length ? sockets[0].join(data.liveStreamingId) : console.log("sockets not able to emit in comment");

    const liveStreamingHistory = await LiveStreamingHistory.findById(data.liveStreamingId);
    if (liveStreamingHistory) {
      liveStreamingHistory.comments += 1;
      await liveStreamingHistory.save();
    }

    io.in(data.liveStreamingId).emit("comment", data);
  });

  //live user send gift during live streaming [put entry on outgoing]
  socket.on("liveUserGift", async (data) => {
    console.log("liveUserGift data:  ", data);

    const gift = JSON.parse(data.gift);
    console.log("gift liveUserGift ==================", gift);

    const sockets = await io.in("globalRoom:" + data.userId).fetchSockets();
    sockets?.length ? sockets[0].join(data.liveStreamingId) : console.log("sockets not able to emit in liveUserGift");

    const user = await User.findById(data.userId).populate("level liveJoinSvga avatarFrame");
    const giftExist = await Gift.findById({ _id: gift?._id });

    let giftCoin = Number(giftExist?.coin);
    let giftCount = Number(data?.giftCount);
    let coin = giftCoin * giftCount;

    if (user && coin <= user.diamond) {
      user.diamond -= coin;
      user.spentCoin += coin;
      user.rCoin += coin;
      await user.save();

      io.in(data.liveStreamingId).emit("gift", data, null, user, data?.senderUserName);

      const liveUser = await LiveUser.findOne({ liveUserId: user._id });

      await FansRanking.create({
        userId: user._id,
        otherUserId: user._id,
        diamond: coin,
        type: 0,
        isIncome: false,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        isAudio: liveUser?.audio || false,
        isPkMode: liveUser?.isPkMode || false,
        roomId: liveUser?.liveUserId, //always be receiver user who is live and earn the coin
      });

      const outgoing = new Wallet();
      outgoing.userId = user._id;
      outgoing.diamond = coin;
      outgoing.type = 0;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      const income = new Wallet();
      income.userId = user._id;
      income.rCoin = coin;
      income.type = 0;
      income.isIncome = true;
      //income.otherUserId = senderUser._id;
      income.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      await Promise.all([outgoing.save(), income.save()]);
      if (liveUser) {
        liveUser.rCoin += coin;
        await liveUser.save();
      }
    }
  });

  socket.on("highBit", async (data) => {
    console.log("highBit---------------------------------:   ", data);

    const globalRooms = Array.from(io.sockets.adapter.rooms.keys()).filter((room) => room?.startsWith("globalRoom:"));

    const message = `${data?.user?.name} won ${data?.coin} Coin(s) in ${data?.game} game`;
    const data_ = {
      message,
      userImage: data?.user?.image,
    };

    console.log("data_---------------------------------:   ", data_);

    // Add delay of 5 seconds (5000 milliseconds)
    setTimeout(() => {
      io.to(globalRooms).emit("highBit", data_);
      console.log("highBit emitted after 5 seconds delay");
    }, 7500);
  });

  //normal user send gift during live streaming [put entry on income and outgoing]
  socket.on("normalUserGift", async (data) => {
    console.log("data in  =======================  normalUserGift: ================================  ", data);

    const gift = JSON.parse(data.gift);
    console.log("gift ==================", gift);

    let liveType = data?.liveType.toLowerCase();

    let liveUser;
    if (liveType === "audio") {
      liveUser = await LiveUser.findOne({ liveUserId: data?.hostId, audio: true });
    } else if (liveType === "video") {
      liveUser = await LiveUser.findOne({ liveUserId: data?.hostId, audio: false });
    }

    const [senderUser, giftExist] = await Promise.all([
      User.findById(data.senderUserId).populate("level liveJoinSvga avatarFrame"), //
      Gift.findById({ _id: gift?._id }),
    ]);

    if (!senderUser) {
      console.log("SenderUser not found");
      io.in("globalRoom:" + data?.senderUserId).emit("gift", null, "SenderUser not found");
      return;
    }

    if (!giftExist) {
      console.log("Gift does not found");
      io.in("globalRoom:" + data?.senderUserId).emit("gift", null, "Gift not found");
      return;
    }

    let giftCoin = Number(giftExist.coin);
    let giftCount = Number(data.giftCount);
    let coin = giftCoin * giftCount;

    if (coin > senderUser.diamond) {
      io.in("globalRoom:" + data?.senderUserId).emit("gift", null, "Insufficient coin");
    }

    const receiverUsers = data?.receiverUserId
      .replace(/\[|\]/g, "")
      .split(",")
      .map((userId) => userId.trim());

    console.log("Receiver Users normalUserGift:   ", receiverUsers);

    if (Number(coin) > settingJSON?.coinForAllRoomAnnouncement) {
      const receiverUserFind = await User.find({ _id: { $in: receiverUsers } });
      const receiverUserNames = receiverUserFind.map((user) => user.name).join(", ");
      const senderUser = await User.findById(data.senderUserId);
      const globalRooms = Array.from(io.sockets.adapter.rooms.keys()).filter((room) => room?.startsWith("globalRoom:"));

      const giftImage = giftExist?.type === 2 ? giftExist?.svgaImage : giftExist?.image;

      const sendData = {
        ...data,
        senderUserImage: senderUser?.image,
        giftImage,
        giftType: giftExist?.type,
      };

      const message = `${senderUser?.name} sent ${Number(coin)} Coin(s) to ${receiverUserNames}`;
      const data_ = {
        message,
        sendData,
      };
      console.log("High Value Gift Sent: ", data_);

      io.to(globalRooms).emit("highValueGiftReceive", data_);
    }

    receiverUsers.forEach(async (receiverUserId) => {
      receiverUserId = receiverUserId?.trim()?.replace("[", "")?.replace("]", "");
      console.log("receiverUserId:   ", receiverUserId);

      const receiverUser = await User.findById(receiverUserId).populate("level liveJoinSvga avatarFrame");
      if (!receiverUser) {
        console.log("does not found receiverUser");
        return;
      }

      if (senderUser && receiverUser && coin <= senderUser.diamond) {
        console.log("gift receiverUser:  ==========================", receiverUser?.name);

        if (receiverUser.isHost) {
          receiverUser.rCoin += coin;
          receiverUser.currentCoin += coin;

          const agencyId = receiverUser?.hostAgency;
          const agency = await Agency.findOne({ _id: agencyId });

          if (agency) {
            agency.currentHostCoin += parseInt(coin);

            const agencyCommissionAmount = (parseInt(coin) * settingJSON?.agencyCommission) / 100;
            agency.currentCoin += agencyCommissionAmount;
            agency.rCoin += agencyCommissionAmount;

            const history = new Wallet({
              agencyId: agencyId,
              rCoin: agencyCommissionAmount,
              type: 17,
              isIncome: true,
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
              otherUserId: receiverUser._id,
              parentBdId: agency.bd || null,
            });

            await Promise.all([agency?.save(), history?.save()]);

            //BD commission
            if (agency.bd) {
              const bd = await Bd.findById(agency.bd);
              if (bd && bd.isActive) {
                const bdCommissionAmount = Math.floor((parseInt(agencyCommissionAmount) * (bd?.bdCommission || 0)) / 100);
                if (bdCommissionAmount > 0) {
                  const bdHistory = new Wallet({
                    bdId: bd._id,
                    rCoin: bdCommissionAmount,
                    type: 21,
                    isIncome: true,
                    date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
                    otherAgencyId: agencyId,
                  });
                  await Promise.all([Bd.updateOne({ _id: bd._id }, { $inc: { rCoin: bdCommissionAmount, netCoin: bdCommissionAmount } }), bdHistory.save()]);
                }
              }
            }
          }
        } else {
          receiverUser.rCoin += coin;
        }

        // room rCoin increases
        let updatedUser;
        if (liveUser && liveUser !== null) {
          updatedUser = await LiveUser.findByIdAndUpdate(
            liveUser._id,
            {
              $inc: {
                rCoin: coin,
              },
            },
            { new: true },
          ).select("rCoin");
        }

        senderUser.diamond -= coin;
        senderUser.spentCoin += coin;

        try {
          await Promise.all([senderUser?.save(), receiverUser?.save()]);
        } catch (error) {
          console.error(error);
        }

        const totalReceivedCoins = updatedUser?.rCoin || 0;
        console.log("totalReceivedCoins ==================", totalReceivedCoins);

        io.in(data.liveStreamingId).emit("gift", data, senderUser, receiverUser, data?.senderUserName);
        io.in(data.liveStreamingId).emit("totalRoomCoins", totalReceivedCoins);

        const pkLiveUser = await LiveUser.findOne({ liveUserId: receiverUser?._id, audio: false });
        console.log("pkLiveUser.isPkMode =======================", pkLiveUser?.isPkMode);

        if (pkLiveUser && pkLiveUser.isPkMode) {
          const [pkGiftHistory, liveUser1, liveUser2] = await Promise.all([
            PkGiftHistory({
              giftId: data.gift._id,
              userId: data.senderUserId,
              liveStreamingId: data.liveStreamingId,
            }).save(),
            LiveUser.findOne({
              audio: false,
              _id: pkLiveUser._id,
            }),
            LiveUser.findOne({
              audio: false,
              liveUserId: pkLiveUser?.pkConfig?.host2Id,
            }),
          ]);

          // pkGiftTopUserFunc(data); // for top 3 user  new func

          if (liveUser1) {
            liveUser1.pkConfig.localRank += coin;
            liveUser1.pkConfig.host1Details.rCoin += coin;
            liveUser1.rCoin += coin;
          }

          if (liveUser2) {
            liveUser2.pkConfig.remoteRank += coin;
            liveUser2.pkConfig.host2Details.rCoin += coin;
          }

          await Promise.all([liveUser1?.save(), liveUser2?.save()]);

          var duration = Math.round((new Date(liveUser1?.pkEndTime).getTime() - new Date().getTime()) / 1000);
          if (duration < 0) duration = 0;

          const [responseForUser1, responseForUser2, sockets1, sockets2] = await Promise.all([
            LiveUser.aggregate([
              {
                $match: { _id: { $eq: liveUser2?._id } },
              },
              { $addFields: { duration: duration } },
              {
                $project: {
                  _id: 1,
                  liveUserId: 1,
                  name: 1,
                  country: 1,
                  image: 1,
                  token: 1,
                  channel: 1,
                  rCoin: 1,
                  avatarFrameImage: 1,
                  countryFlagImage: 1,
                  diamond: 1,
                  username: 1,
                  duration: 1,
                  isVIP: 1,
                  age: 1,
                  pkEndTime: 1,
                  pkIdentity: 1,
                  pkConfig: 1,
                  isPkMode: 1,
                  liveStreamingId: 1,
                  agoraUID: 1,
                  view: { $size: "$view" },
                },
              },
            ]),
            LiveUser.aggregate([
              {
                $match: { _id: { $eq: liveUser1?._id } },
              },
              { $addFields: { duration: duration } },
              {
                $project: {
                  _id: 1,
                  liveUserId: 1,
                  name: 1,
                  country: 1,
                  image: 1,
                  token: 1,
                  channel: 1,
                  rCoin: 1,
                  avatarFrameImage: 1,
                  countryFlagImage: 1,
                  diamond: 1,
                  username: 1,
                  duration: 1,
                  isVIP: 1,
                  age: 1,
                  pkEndTime: 1,
                  pkIdentity: 1,
                  pkConfig: 1,
                  isPkMode: 1,
                  liveStreamingId: 1,
                  agoraUID: 1,
                  view: { $size: "$view" },
                },
              },
            ]),
            io.in("globalRoom:" + pkLiveUser?._id?.toString()).fetchSockets(),
            io
              .in("globalRoom:" + pkLiveUser?.pkConfig?.host2Id) // other pk liveUser
              .fetchSockets(),
          ]);

          sockets1?.length
            ? sockets1[0].join(liveUser1?.pkConfig?.host1LiveId) // if receiverUserId disconnected then again join
            : console.log("sockets1 not able to emit in normalUserGift");

          if (liveUser1?.pkConfig?.host1LiveId) {
            io.in(liveUser1?.pkConfig?.host1LiveId).emit("pkAnswer", {
              type: 2,
              data: responseForUser2[0],
            });
          }

          sockets2?.length
            ? sockets2[0].join(liveUser2?.pkConfig?.host1LiveId) // join in liveStreamingId
            : console.log("sockets2 not able to emit in normalUserGift");

          if (liveUser2?.pkConfig?.host1LiveId) {
            io.in(liveUser2?.pkConfig?.host1LiveId).emit("pkAnswer", {
              type: 2,
              data: responseForUser1[0], // join liveUser emit  in liveStreaming for rCoin update
            });
          }

          if (liveUser2?.pkConfig?.host1LiveId) {
            io.in(liveUser2.pkConfig.host1LiveId).emit("gift", data, senderUser, receiverUser, data?.senderUserName);
          }

          console.log("liveUser1.pkConfig.host1LiveId ==============", liveUser1?.pkConfig?.host1LiveId);
          console.log("liveUser2.pkConfig.host1LiveId ==============", liveUser2?.pkConfig?.host1LiveId);

          const abc = io.sockets.adapter.rooms.get(liveUser1?.pkConfig?.host1LiveId);
          console.log("liveUser1.pkConfig.host1LiveId SSS =====================", abc);

          const xyz = io.sockets.adapter.rooms.get(liveUser2?.pkConfig?.host1LiveId);
          console.log("liveUser2?.pkConfig?.host1LiveId SSS =====================", xyz);
        }

        // if (senderUser._id.toString() !== receiverUser._id.toString()) {
        const liveUserExist = await LiveUser.findOne({ liveStreamingId: new mongoose.Types.ObjectId(data?.liveStreamingId) });

        const historyData = [
          {
            userId: senderUser._id,
            diamond: coin,
            type: 0,
            isIncome: false,
            otherUserId: receiverUser._id,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            isAudio: liveUserExist?.audio || false,
            isPkMode: liveUserExist?.isPkMode || false,
          },
          {
            userId: receiverUser._id,
            rCoin: coin,
            type: 0,
            isIncome: true,
            otherUserId: senderUser._id,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            isAudio: liveUserExist?.audio || false,
            isPkMode: liveUserExist?.isPkMode || false,
            parentAgencyId: receiverUser?.hostAgency || null,
          },
        ];

        await Promise.all([
          FansRanking.create({
            userId: senderUser._id,
            otherUserId: receiverUser._id,
            diamond: coin,
            type: 0,
            isIncome: false,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            isAudio: liveUser?.audio || false,
            isPkMode: liveUser?.isPkMode || false,
            roomId: liveUser?.liveUserId, //always be receiver user who is live and earn the coin
          }),
          Wallet.insertMany(historyData),
        ]);
        // }

        try {
          const updatedLiveStreaming = await LiveStreamingHistory.findOneAndUpdate(
            { _id: data.liveStreamingId },
            {
              $inc: { rCoin: coin, gifts: gift.count },
              $set: { endTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
            },
            { new: true },
          );

          if (!updatedLiveStreaming) {
            console.error("LiveStreamingHistory not found for ID:", data?.liveStreamingId);
          } else {
            console.log("Updated LiveStreamingHistory:", updatedLiveStreaming);
          }
        } catch (error) {
          console.error("Error updating LiveStreamingHistory:", error);
        }
      }
    });
  });

  socket.on("addView", async (data) => {
    console.log("data in addView: ", data);
    const [liveStreamingHistory, liveUser] = await Promise.all([LiveStreamingHistory.findById(data.liveStreamingId), LiveUser.findById(data.liveUserMongoId)]);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in addView");

    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        "view.userId": data.userId,
      });

      if (joinedUserExist) {
        await LiveUser.updateOne(
          { _id: liveUser._id, "view.userId": data.userId },
          {
            $set: {
              "view.$.userId": data.userId,
              "view.$.image": data.image,
              "view.$.name": data.name,
              "view.$.gender": data.gender,
              "view.$.avatarFrameImage": data.avatarFrame ? data.avatarFrame : "",
              "view.$.country": data.country,
              "view.$.isVIP": data.isVIP,
              "view.$.fcmToken": data.fcmToken,
              "view.$.notification": data.notification,
              "view.$.isAdd": true,
            },
          },
        );
      } else {
        liveUser.view.push({
          userId: data.userId,
          image: data.image,
          country: data.country,
          gender: data.gender,
          avatarFrameImage: data.avatarFrame ? data.avatarFrame : "",
          name: data.name,
          isVIP: data.isVIP,
          fcmToken: data.fcmToken,
          notification: data.notification,
          isAdd: true,
        });

        await liveUser.save();
      }
    }

    const _liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveStreamingHistory && _liveUser) {
      liveStreamingHistory.user = _liveUser.view.length;
      liveStreamingHistory.endTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      liveStreamingHistory.momentEndTime = moment(new Date()).format("HH:mm:ss");
      await liveStreamingHistory.save();

      let duration = 0;

      if (_liveUser.pkEndTime !== null) {
        duration = Math.round((new Date(_liveUser?.pkEndTime).getTime() - new Date().getTime()) / 1000);
      } else {
        duration = 0;
      }

      const liveUser = await LiveUser.aggregate([
        { $match: { _id: _liveUser._id } },
        {
          $addFields: {
            duration: duration,
            view: { $size: "$view" },
          },
        },
      ]);

      const socket1 = await io.in(data.liveStreamingId).fetchSockets();
      console.log("SOCKET.length .... addView  ", socket1?.length);

      io.in(data.liveStreamingId).emit("view", _liveUser.view, data);
      io.in(data.liveStreamingId).emit("hostDetailsForAudience", liveUser[0]);
      io.in(data.liveStreamingId).emit("seat", liveUser[0], null);
    }
  });

  socket.on("lessView", async (data) => {
    console.log("lessView data: ", data);

    const liveStreamingHistory = await LiveStreamingHistory.findById(data?.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].leave(data.liveStreamingId) : console.log("socket1 not able to join in lessView");

    await LiveUser.updateOne(
      { _id: data.liveUserMongoId, "view.userId": data.userId },
      {
        $set: {
          "view.$.isAdd": false,
        },
      },
    );

    const [liveUser, _liveUser] = await Promise.all([
      LiveUser.findOne({
        _id: data.liveUserMongoId,
        "view.isAdd": true,
      }),
      LiveUser.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
        },
        {
          $addFields: {
            view: { $size: "$view" },
          },
        },
      ]),
    ]);

    if (liveStreamingHistory) {
      liveStreamingHistory.endTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      liveStreamingHistory.momentEndTime = moment(new Date()).format("HH:mm:ss");
      await liveStreamingHistory.save();
    }

    await io.in(data.liveStreamingId).emit("view", liveUser ? liveUser.view : [], null);
    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
  });

  socket.on("liveHostEnd", async (data) => {
    console.log("liveHostEnd data:      ===============================================", data);

    const liveStreamingHistory = await LiveStreamingHistory.findById(data?.liveStreamingId);
    if (liveStreamingHistory) {
      liveStreamingHistory.endTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      liveStreamingHistory.momentEndTime = moment(new Date()).format("HH:mm:ss");

      function formatSecondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        const formattedHours = String(hours).padStart(2, "0");
        const formattedMinutes = String(minutes).padStart(2, "0");
        const formattedSeconds = String(remainingSeconds).padStart(2, "0");

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      }

      liveStreamingHistory.duration = formatSecondsToTime(data?.time);
      await liveStreamingHistory.save();
      console.log("liveStreamingHistory Updated in liveHostEnd:   ");
    }
    const liveUser = await LiveUser.findOne({
      liveUserId: data?.liveUserId,
      liveStreamingId: data?.liveStreamingId,
    });

    if (liveUser?.isPkMode && liveUser?.pkIdentity?.count === 0) {
      console.log("liveUser.isPkMode == true && count = 0  ");

      var duration = Math.round((new Date(liveUser.pkEndTime).getTime() - new Date().getTime()) / 1000);
      if (duration < 0) {
        duration = 0;
      }

      await LiveUser.updateMany({ "pkIdentity.pkId": liveUser.pkIdentity.pkId }, { "pkIdentity.count": 1 }, { new: true });

      if (liveUser?.pkConfig?.localRank > liveUser?.pkConfig?.remoteRank) {
        await LiveUser.findOneAndUpdate({ _id: liveUser._id }, { "pkConfig.isWinner": 2 }, { new: true });
        await LiveUser.findOneAndUpdate({ liveUserId: liveUser?.pkConfig.host2Id }, { "pkConfig.isWinner": 1 }, { new: true });
      } else if (liveUser?.pkConfig?.localRank < liveUser?.pkConfig?.remoteRank) {
        await LiveUser.findOneAndUpdate({ _id: liveUser._id }, { "pkConfig.isWinner": 1 }, { new: true });
        await LiveUser.findOneAndUpdate({ liveUserId: liveUser?.pkConfig.host2Id }, { "pkConfig.isWinner": 2 }, { new: true });
      } else if (liveUser?.pkConfig?.localRank == liveUser?.pkConfig?.remoteRank) {
        await LiveUser.findOneAndUpdate({ _id: liveUser._id }, { "pkConfig.isWinner": 1 }, { new: true });
        await LiveUser.findOneAndUpdate({ liveUserId: liveUser?.pkConfig.host2Id }, { "pkConfig.isWinner": 2 }, { new: true });
      }

      const responseForUser1 = await LiveUser.aggregate([
        {
          $match: {
            liveUserId: { $eq: liveUser.pkConfig.host2Id },
          },
        },
        { $addFields: { duration: duration } },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            rCoin: 1,
            avatarFrameImage: 1,
            countryFlagImage: 1,
            diamond: 1,
            username: 1,
            duration: 1,
            isVIP: 1,
            age: 1,
            pkConfig: 1,
            isPkMode: 1,
            pkIdentity: 1,
            liveStreamingId: 1,
            agoraUID: 1,
            view: { $size: "$view" },
          },
        },
      ]);

      const responseForUser2 = await LiveUser.aggregate([
        {
          $match: { _id: { $eq: liveUser._id } },
        },
        { $addFields: { duration: duration } },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            rCoin: 1,
            avatarFrameImage: 1,
            countryFlagImage: 1,
            diamond: 1,
            username: 1,
            duration: 1,
            isVIP: 1,
            age: 1,
            pkConfig: 1,
            pkIdentity: 1,
            isPkMode: 1,
            liveStreamingId: 1,
            agoraUID: 1,
            view: { $size: "$view" },
          },
        },
      ]);

      const socket1 = await io.in("globalRoom:" + data.HOST_1_ID).fetchSockets();
      socket1?.length ? socket1[0].join(liveUser.pkConfig.host1LiveId) : console.log("data.HOST_1_ID not able to join in singleLiveUser");

      const socket2 = await io.in("globalRoom:" + data.HOST_2_ID).fetchSockets();
      socket2?.length ? socket2[0].join(liveUser.pkConfig.host2LiveId) : console.log("data.HOST_2_ID not able to join in singleLiveUser");

      const abc = io.sockets.adapter.rooms.get(liveUser.pkConfig.host1LiveId);
      console.log("ROOM =====liveUser.pkConfig.host1LiveId ======", liveUser.pkConfig.host1LiveId, abc);

      const xyz = io.sockets.adapter.rooms.get(liveUser.pkConfig.host2LiveId);
      console.log("ROOM ======  liveUser.pkConfig.host2LiveId =====: ", liveUser.pkConfig.host2LiveId, xyz);
      console.log("pkEnd EMIT ++++++++++++++++++++");

      socket.in(liveUser.pkConfig.host1LiveId).emit("pkEnd", {
        data: responseForUser2[0],
        winner: responseForUser2[0].pkConfig.isWinner == 2 ? responseForUser2[0].pkConfig.host1Details : responseForUser2[0].pkConfig.host2Details,
      });
      socket.in(liveUser.pkConfig.host2LiveId).emit("pkEnd", {
        data: responseForUser1[0],
        winner: responseForUser1[0].pkConfig.isWinner == 2 ? responseForUser1[0].pkConfig.host1Details : responseForUser1[0].pkConfig.host2Details,
      });

      await LiveUser.updateMany(
        { "pkIdentity.pkId": { $eq: liveUser?.pkIdentity.pkId } },
        {
          $set: {
            isPkMode: false,
            pkEndTime: null,
            //"pkIdentity.count": 0,
            "pkIdentity.pkId": null,
            "pkConfig.host1Id": null,
            "pkConfig.host2Id": null,
            "pkConfig.host1Token": null,
            "pkConfig.host2Token": null,
            "pkConfig.host1Name": null,
            "pkConfig.host2Name": null,
            "pkConfig.host1UniqueId": null,
            "pkConfig.host2UniqueId": null,
            "pkConfig.host1Image": null,
            "pkConfig.host2Image": null,
            "pkConfig.host1Channel": null,
            "pkConfig.host2Channel": null,
            "pkConfig.host1LiveId": null,
            "pkConfig.host2LiveId": null,
            "pkConfig.host1AgoraUID": 0,
            "pkConfig.host2AgoraUID": 0,
            "pkConfig.localRank": 0,
            "pkConfig.remoteRank": 0,
            "pkConfig.isWinner": 0,
            "pkConfig.host1Details.name": null,
            "pkConfig.host1Details.uniqueId": null,
            "pkConfig.host1Details.rCoin": 0,
            "pkConfig.host1Details.avatarFrameImage": null,
            "pkConfig.host1Details.countryFlagImage": null,
            "pkConfig.host1Details.image": null,
            "pkConfig.host1Details.country": null,
            "pkConfig.host1Details.isVIP": null,
            "pkConfig.host2Details.name": null,
            "pkConfig.host2Details.uniqueId": null,
            "pkConfig.host2Details.rCoin": 0,
            "pkConfig.host1Details.avatarFrameImage": null,
            "pkConfig.host2Details.countryFlagImage": null,
            "pkConfig.host2Details.image": null,
            "pkConfig.host2Details.country": null,
            "pkConfig.host2Details.isVIP": null,
          },
        },
        { new: true },
      );
    } else {
      console.log("pkEnd EMIT ++++++++++++++++++++ Pk is Not start for this ");
      console.log("else ============ liveHostEnd =============");
      socket.in("globalRoom:" + data.HOST_1_ID).emit("pkEnd", "Pk is Not start for this Host");
      socket.in("globalRoom:" + data.HOST_2_ID).emit("pkEnd", "Pk is Not start for this Host");
    }

    //if (liveUser) await liveUser.deleteOne();

    io.in(data.liveStreamingId).emit("liveHostEnd", "end");
    io?.socketsLeave(data.liveStreamingId);

    if (liveUser && !liveUser.audio) {
      await liveUser.deleteOne();
      io?.socketsLeave(data.liveStreamingId);
    }
  });

  //pk
  socket.on("singleLiveUser", async (data) => {
    console.log("singleLiveUser Data ============================================================", data);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in singleLiveUser");

    socket.join(data.liveStreamingId);

    const liveUser = await LiveUser.findOne({ liveUserId: data.userId });
    if (!liveUser) return io.in("globalRoom:" + data.joinUserId).emit("isLiveUser", data);

    var duration = Math.round((new Date(liveUser.pkEndTime).getTime() - new Date().getTime()) / 1000);

    if (duration < 0 || isNaN(duration)) {
      duration = 0;
    }

    if (data?.type?.trim()?.toLowerCase() === "audio") {
      const liveUser_ = await LiveUser.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(liveUser._id),
            audio: true,
          },
        },
        { $addFields: { duration: duration } },
        {
          $lookup: {
            from: "users",
            localField: "admins",
            foreignField: "_id",
            as: "admins",
          },
        },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            rCoin: 1,
            diamond: 1,
            username: 1,
            duration: 1,
            isVIP: 1,
            age: 1,
            avatarFrameImage: 1,
            countryFlagImage: 1,
            pkEndTime: 1,
            pkConfig: 1,
            pkIdentity: 1,
            isPkMode: 1,
            liveStreamingId: 1,
            agoraUID: 1,
            filter: 1,
            roomName: 1,
            roomImage: 1,
            view: { $size: "$view" },
            admins: {
              $map: {
                input: "$admins",
                as: "admin",
                in: {
                  _id: "$$admin._id",
                  name: "$$admin.name",
                  username: "$$admin.username",
                  image: "$$admin.image",
                },
              },
            },
          },
        },
      ]);
      console.log("liveUser audio =============================================: ", liveUser_[0]?.liveStreamingId);

      socket.emit("dummy", liveUser_[0]);
    }

    if (data?.type?.trim()?.toLowerCase() === "other") {
      const liveUser_ = await LiveUser.aggregate([
        {
          $match: { liveStreamingId: { $eq: new mongoose.Types.ObjectId(data.liveStreamingId) } },
        },
        { $addFields: { duration: duration } },
        {
          $lookup: {
            from: "users",
            localField: "admins",
            foreignField: "_id",
            as: "admins",
          },
        },
        {
          $project: {
            _id: 1,
            liveUserId: 1,
            name: 1,
            country: 1,
            image: 1,
            token: 1,
            channel: 1,
            rCoin: 1,
            diamond: 1,
            username: 1,
            duration: 1,
            isVIP: 1,
            age: 1,
            avatarFrameImage: 1,
            countryFlagImage: 1,
            pkEndTime: 1,
            pkConfig: 1,
            pkIdentity: 1,
            isPkMode: 1,
            liveStreamingId: 1,
            agoraUID: 1,
            filter: 1,
            roomName: 1,
            roomImage: 1,
            view: { $size: "$view" },
            admins: {
              $map: {
                input: "$admins",
                as: "admin",
                in: {
                  _id: "$$admin._id",
                  name: "$$admin.name",
                  username: "$$admin.username",
                  image: "$$admin.image",
                },
              },
            },
          },
        },
      ]);
      console.log("liveUser other =============================================: ", liveUser_[0]?.liveStreamingId);

      socket.emit("dummy", liveUser_[0]);
    }
  });

  //audio-room
  socket.on("roomName", async (data) => {
    console.log("roomName data: ", data);

    const liveUser = await LiveUser.findOne({ liveStreamingId: data.liveStreamingId });
    if (liveUser) {
      liveUser.roomName = data?.roomName;
      await liveUser.save();
    }

    const socket = await io.in(data.liveStreamingId).fetchSockets();
    console.log("socket in roomName:  ", socket.length);

    socket?.length ? socket[0].join(data.liveStreamingId) : console.log("socket not able to join in roomName");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("fetched  ", xyz);

    io.in(data.liveStreamingId).emit("roomName", data);
  });

  socket.on("roomWelcome", async (data) => {
    console.log("roomWelcome data: ", data);

    const liveUser = await LiveUser.findOne({ liveStreamingId: data.liveStreamingId });
    if (liveUser) {
      liveUser.roomWelcome = data?.roomWelcome;
      await liveUser.save();
    }

    const socket = await io.in(data.liveStreamingId).fetchSockets();
    console.log("socket in roomWelcome:  ", socket.length);

    socket?.length ? socket[0].join(data.liveStreamingId) : console.log("socket not able to join in roomWelcome");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("fetched  ", xyz);

    io.in(data.liveStreamingId).emit("roomWelcome", data);
  });

  socket.on("roomImage", async (data) => {
    console.log("roomImage data: ", data);

    const liveUser = await LiveUser.findOne({ liveStreamingId: data.liveStreamingId });
    if (liveUser) {
      liveUser.roomImage = data?.roomImage;
      await liveUser.save();
    }

    const socket = await io.in(data.liveStreamingId).fetchSockets();
    console.log("socket in roomImage:  ", socket.length);

    socket?.length ? socket[0].join(data.liveStreamingId) : console.log("socket not able to join in roomImage");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("fetched  ", xyz);

    io.in(data.liveStreamingId).emit("roomImage", data);
  });

  socket.on("privateCode", async (data) => {
    console.log("privateCode data: ", data);

    const parsed = JSON.parse(data);
    console.log("parsed privateCode data: ", parsed);

    socket.join(data.liveStreamingId);

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in privateCode ==================: ", xyz);

    io.in(data.liveStreamingId).emit("privateCode", data);
  });

  socket.on("sendReaction", async (data) => {
    console.log("sendReaction data:  ", data);

    const socket = await io.in(data.liveStreamingId).fetchSockets();
    socket?.length ? socket[0].join(data.liveStreamingId) : console.log("socket not able to join in sendReaction");
    console.log("socket in sendReaction:  ", socket.length);

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("fetched in sendReaction:", xyz);

    io.in(data.liveStreamingId).emit("sendReaction", data);
  });

  socket.on("audioLiveHostRemove", async (data) => {
    console.log("audioLiveHostRemove  data ============== :   ", data);

    const updatedLiveUser = await LiveUser.findOneAndUpdate(
      { liveUserId: new mongoose.Types.ObjectId(data.liveUserId) },
      { isHostExists: false },
      { new: true }, // Return the updated document
    );

    io.in(data.liveStreamingId).emit("audioLiveHostRemove", updatedLiveUser);

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("before fetched in audioLiveHostRemove ================ ", xyz);

    const socket2 = await io.in("globalRoom:" + data?.liveUserId.toString()).fetchSockets();
    if (socket2?.length) {
      // If socket is found, remove the user from the live room
      socket2[0].leave(data.liveStreamingId);
      console.log(`User with ID ${data?.liveUserId} removed from live room ${data.liveStreamingId}`);
    } else {
      console.log("socket2 not found or not able to remove from live room");
    }

    const abc = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("after fetched in audioLiveHostRemove =================", abc);
  });

  socket.on("seatUpdate", async (data) => {
    console.log("seatUpdate data:     ", data);

    const socket = await io.in(data.liveStreamingId).fetchSockets();
    socket?.length ? socket[0].join(data.liveStreamingId) : console.log("socket not able to join in seatUpdate");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("fetched in seatUpdate:  ", xyz);

    const liveUser = await LiveUser.findOne({ liveStreamingId: data?.liveStreamingId });

    const seatCount = data.seatCount;
    console.log("seatCount  ", seatCount);
    console.log("exist liveUser's seat ----", liveUser.seat.length);

    const validSeatCounts = [8, 12, 15];
    if (!validSeatCounts.includes(seatCount)) {
      console.log("Invalid seat count:", seatCount);

      io.in(data.liveStreamingId).emit("seat", "Invalid seat count. It must be 8, 12, or 15.", null);
      return;
    }

    if (liveUser.seat.length > seatCount) {
      //Emit lessParticipants for users being removed from seats beyond the new seat count

      for (let i = seatCount; i < liveUser.seat.length; i++) {
        console.log("liveUser.seat[i]  ---------------------", liveUser.seat[i]);

        if (liveUser.seat[i].userId && liveUser.seat[i].userId !== null && liveUser.seat[i].userId !== "undefined") {
          io.in(data.liveStreamingId).emit("lessParticipants", liveUser.seat[i].userId);

          liveUser.seat[i] = {
            userId: null,
            image: null,
            name: null,
            avatarFrameImage: null,
            country: null,
            agoraUid: null,
            mute: 0,
            lock: false,
            reserved: false,
            invite: false,
          };
        }
      }

      await liveUser.save();
    }

    if (liveUser.seat.length > seatCount) {
      liveUser.seat = liveUser.seat.slice(0, seatCount);
    } else {
      const seatsToAdd = seatCount - liveUser.seat.length;
      const defaultSeatsToAdd = defaultSeats.slice(liveUser.seat.length, liveUser.seat.length + seatsToAdd);
      liveUser.seat = liveUser.seat.concat(defaultSeatsToAdd);

      console.log("seatsToAdd       ", seatsToAdd);
      console.log("defaultSeatsToAdd", defaultSeatsToAdd);
    }

    await liveUser.save();

    console.log("Updated liveUser seat count", liveUser.seat.length);

    liveUser.view = liveUser.view.filter((item) => item.isAdd === true).length;

    const liveUserData = {
      ...liveUser.toObject(),
      view: liveUser.view[0],
    };

    io.in(data.liveStreamingId).emit("seat", liveUserData, null);
  });

  socket.on("addRequested", async (data_) => {
    console.log("addRequested data: ", data_);

    const data = JSON.parse(data_);
    console.log("parsed addRequested data: ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in addRequested");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in addRequested ==================: ", xyz);

    const liveUser = await LiveUser.findById(data.liveUserMongoId);
    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        "seat.userId": data.userId,
        "seat.position": { $ne: data.position },
      });

      if (joinedUserExist) {
        console.log("joinedUserExist in addRequested: ", joinedUserExist);

        await LiveUser.findOneAndUpdate(
          { _id: liveUser._id, "seat.userId": data.userId },
          {
            $set: {
              "seat.$.userId": null,
              "seat.$.image": null,
              "seat.$.avatarFrameImage": null,
              "seat.$.name": null,
              "seat.$.country": null,
              "seat.$.agoraUid": null,
              "seat.$.mute": 0,
              "seat.$.lock": false,
              "seat.$.reserved": false,
              "seat.$.invite": false,
            },
          },
        ).lean();
      }

      await LiveUser.findOneAndUpdate(
        { _id: liveUser._id, "seat.position": data.position },
        {
          $set: {
            "seat.$.userId": data.userId,
            "seat.$.image": null,
            "seat.$.avatarFrameImage": null,
            "seat.$.name": null,
            "seat.$.country": null,
            "seat.$.agoraUid": null,
            "seat.$.mute": 0,
            "seat.$.lock": true,
            "seat.$.reserved": false,
            "seat.$.invite": true,
          },
        },
      ).lean();

      const liveUser_ = await LiveUser.aggregate([
        {
          $match: { _id: liveUser._id },
        },
        { $addFields: { view: { $size: "$view" } } },
      ]);

      console.log("liveUser emitted in addRequested: ", liveUser_[0]);

      io.in(data.liveStreamingId).emit("seat", liveUser_[0], null);
      io.in(data.liveStreamingId).emit("invite", liveUser_[0].seat[data.position]);
    }
  });

  socket.on("addParticipants", async (data_) => {
    console.log("data in addParticipants:  ", data_);

    const data = JSON.parse(data_);
    console.log("parsed data in addParticipants:  ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in addParticipants");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in addParticipants ==================: ", xyz);

    const liveUser = await LiveUser.findById(data.liveUserMongoId);

    if (liveUser) {
      const joinedUserExist = await LiveUser.findOne({
        _id: liveUser._id,
        seat: {
          $elemMatch: { userId: data.userId, position: { $ne: data.position } },
        },
      });

      console.log("joinExist in add participants:  ", joinedUserExist);

      if (joinedUserExist) {
        console.log("joinExist in add participants:  ");

        await LiveUser.findOneAndUpdate(
          {
            _id: liveUser._id,
            "seat.userId": new mongoose.Types.ObjectId(data.userId),
          },
          {
            $set: {
              "seat.$.userId": null,
              "seat.$.image": null,
              "seat.$.avatarFrameImage": null,
              "seat.$.name": null,
              "seat.$.country": null,
              "seat.$.agoraUid": null,
              "seat.$.mute": 0,
              "seat.$.lock": false,
              "seat.$.reserved": false,
              "seat.$.invite": false,
            },
          },
        ).lean();

        const datafind = await LiveUser.findOne({
          _id: liveUser._id,
          "seat.userId": new mongoose.Types.ObjectId(data.userId),
        }).lean();

        if (!datafind) {
          await LiveUser.findOneAndUpdate(
            { _id: liveUser._id, "seat.position": data.position },
            {
              $set: {
                "seat.$.userId": data.userId,
                "seat.$.image": data.image,
                "seat.$.name": data.name,
                "seat.$.avatarFrameImage": data?.avatarFrame,
                "seat.$.country": data.country,
                "seat.$.agoraUid": data.agoraUid,
                "seat.$.mute": data.mute ? data.mute : 0,
                "seat.$.lock": false,
                "seat.$.reserved": true,
                "seat.$.invite": false,
              },
            },
          ).lean();
        } else {
          await LiveUser.findOneAndUpdate(
            {
              _id: liveUser._id,
              "seat.userId": new mongoose.Types.ObjectId(data.userId),
            },
            {
              $set: {
                "seat.$.userId": null,
                "seat.$.image": null,
                "seat.$.name": null,
                "seat.$.avatarFrameImage": null,
                "seat.$.country": null,
                "seat.$.agoraUid": null,
                "seat.$.mute": 0,
                "seat.$.lock": false,
                "seat.$.reserved": false,
                "seat.$.invite": false,
              },
            },
          ).lean();

          await LiveUser.findOneAndUpdate(
            { _id: liveUser._id, "seat.position": data.position },
            {
              $set: {
                "seat.$.userId": data.userId,
                "seat.$.image": data.image,
                "seat.$.name": data.name,
                "seat.$.avatarFrameImage": data?.avatarFrame,
                "seat.$.country": data.country,
                "seat.$.agoraUid": data.agoraUid,
                "seat.$.mute": data.mute ? data.mute : 0,
                "seat.$.lock": false,
                "seat.$.reserved": true,
                "seat.$.invite": false,
              },
            },
          ).lean();
        }

        const _liveUser = await LiveUser.aggregate([
          {
            $match: { _id: liveUser._id },
          },
          { $addFields: { view: { $size: "$view" } } },
        ]);

        console.log("socket data in addParticipants after........", _liveUser[0]);

        io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
      } else {
        console.log("else add participants:  ");

        await LiveUser.findOneAndUpdate(
          { _id: liveUser._id, "seat.position": data.position },
          {
            $set: {
              "seat.$.userId": data.userId,
              "seat.$.image": data.image,
              "seat.$.name": data.name,
              "seat.$.avatarFrameImage": data?.avatarFrame,
              "seat.$.country": data.country,
              "seat.$.agoraUid": data.agoraUid,
              "seat.$.mute": data.mute ? data.mute : 0,
              "seat.$.lock": false,
              "seat.$.reserved": true,
              "seat.$.invite": false,
            },
          },
        ).lean();

        const _liveUser = await LiveUser.aggregate([
          {
            $match: { _id: liveUser._id },
          },
          { $addFields: { view: { $size: "$view" } } },
        ]);

        //console.log("socket data in addParticipants after........ else", _liveUser[0]);

        io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
      }
    }
  });

  socket.on("lessParticipants", async (data_) => {
    console.log("data in lessParticipants:   ", data_);

    const data = JSON.parse(data_);
    console.log("parsed data in lessParticipants:   ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in lessParticipants");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in lessParticipants ==================: ", xyz);

    let liveUser;
    if (data?.userId) {
      console.log("lessParticipants by userId ---");

      liveUser = await LiveUser.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
          "seat.userId": new mongoose.Types.ObjectId(data?.userId),
        },
        {
          $set: {
            "seat.$.userId": null,
            "seat.$.image": null,
            "seat.$.name": null,
            "seat.$.avatarFrameImage": null,
            "seat.$.country": null,
            "seat.$.agoraUid": null,
            "seat.$.mute": 0,
            "seat.$.lock": false,
            "seat.$.reserved": false,
            "seat.$.invite": false,
          },
        },
        {
          new: true,
        },
      );
    }

    if (data.position !== -1) {
      liveUser = await LiveUser.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
          "seat.position": data.position,
        },
        {
          $set: {
            "seat.$.userId": null,
            "seat.$.image": null,
            "seat.$.name": null,
            "seat.$.avatarFrameImage": null,
            "seat.$.country": null,
            "seat.$.agoraUid": null,
            "seat.$.mute": 0,
            "seat.$.lock": false,
            "seat.$.reserved": false,
            "seat.$.invite": false,
          },
        },
        {
          new: true,
        },
      );
    }

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
    io.in("globalRoom:" + data?.removedUserID).emit("lessParticipants", _liveUser[0], null);
    io.in(data.liveStreamingId).emit("lessParticipants", data?.userId);

    const socket2 = await io.in("globalRoom:" + data?.removedUserID).fetchSockets();

    if (socket2?.length) {
      // If socket is found, remove the user from the live room
      socket2[0].leave(data.liveStreamingId);
      console.log(`User with ID ${data.removedUserID} removed from live room ${data.liveStreamingId}`);
    } else {
      console.log("socket2 not found or not able to remove from live room");
    }

    //socket.leave(data.liveStreamingId);

    const abc = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("after after after adapter sockets in else lessParticipants  ==================: ", abc);
  });

  socket.on("muteSeat", async (data_) => {
    console.log("data in muteSeat:   ", data_);

    const data = JSON.parse(data_);
    console.log("parsed data in muteSeat:   ", data);

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in muteSeat ==================: ", xyz);

    await LiveUser.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.position": data.position,
      },
      {
        $set: {
          "seat.$.mute": data.mute,
        },
      },
      {
        new: true,
      },
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    if (data.agoraId == 0 || data.agoraId) {
      console.log("data.agoraId :", data.agoraId);

      io.in(data.liveStreamingId).emit("seat", _liveUser[0], {
        agoraId: data.agoraId,
        mute: data.mute,
      });
    } else {
      console.log("No agoraId :");

      io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
    }

    io.in(data.liveStreamingId).emit("muteSeat", {
      agoraId: data.agoraId,
      mute: data.mute,
      position: data.position,
    });

    if (data.position === -1) {
      console.log("position is -1");

      await LiveUser.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
        },
        {
          $set: {
            "audioConfig.isHostMute": data.mute,
          },
        },
        {
          new: true,
        },
      );
    }
  });

  socket.on("lockSeat", async (data_) => {
    console.log("data in lockSeat:   ", data_);

    const data = JSON.parse(data_);
    console.log("parsed data in lockSeat:   ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in lockSeat");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in lockSeat ==================: ", xyz);

    await LiveUser.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.position": data.position,
      },
      {
        $set: {
          "seat.$.lock": data.lock,
        },
      },
      {
        new: true,
      },
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
  });

  socket.on("changeTheme", async (data) => {
    console.log("changeTheme data:  ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in changeTheme");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in changeTheme ==================: ", xyz);

    const liveUser = await LiveUser.findById(data.liveUserMongoId);
    if (liveUser) {
      liveUser.background = data.background;
      await liveUser.save();

      io.in(data.liveStreamingId).emit("changeTheme", {
        background: data.background,
      });
    }
  });

  socket.on("getUserProfile", async (data) => {
    console.log("getUserProfile data:  ", data);

    const user = await User.findById(data.toUserId)
      .populate("level liveJoinSvga avatarFrame")
      .select("name username uniqueId gender age image country bio followers following video post level liveJoinSvga avatarFrameImage countryFlagImage avatarFrame isVIP isHost isAgency isCoinSeller");

    const follower = await Follower.findOne({
      fromUserId: data.fromUserId,
      toUserId: user._id,
    });

    const userData = {
      ...user._doc,
      userId: user._id,
      isFollow: follower ? true : false,
    };

    io.in("globalRoom:" + data.fromUserId.toString()).emit("data", userData);
  });

  socket.on("getUserProfile2", async (data) => {
    console.log("getUserProfile2 data:  ", data);

    const user = await User.findById(data.toUserId)
      .populate("level liveJoinSvga avatarFrame")
      .select("name username uniqueId gender age image country bio followers following video post level liveJoinSvga avatarFrameImage countryFlagImage avatarFrame isVIP isHost isAgency isCoinSeller");

    const follower = await Follower.findOne({
      fromUserId: data.fromUserId,
      toUserId: user._id,
    });

    const userData = {
      ...user._doc,
      userId: user._id,
      isFollow: follower ? true : false,
    };

    io.in("globalRoom:" + data.fromUserId.toString()).emit("getUserProfile2", userData);
  });

  //misc
  socket.on("allSeatLock", async (data) => {
    console.log("data in allSeatLock:   ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in allSeatLock");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in allSeatLock ==================: ", xyz);

    await LiveUser.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
      },
      {
        $set: {
          "seat.$.lock": data.lock,
        },
      },
      {
        new: true,
      },
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
  });

  socket.on("blockedList", async (data) => {
    console.log("blockedList data:  ", data);
    io.in(data.liveStreamingId).emit("blockedList", data);

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in blockedList ==================: ", xyz);
  });

  socket.on("updateBlockedList", async (data) => {
    console.log("updateBlockedList data:  ", data);

    try {
      const { type, liveStreamingId, blockedUserId, blockUntil } = data;

      const xyz = io.sockets.adapter.rooms.get(liveStreamingId);
      console.log(`adapter sockets in updateBlockedList type ${type} ==================: `, xyz);

      io.in(liveStreamingId).emit("updateBlockedList", data);

      if (type.trim().toLowerCase() === "block") {
        const updatedLiveUser = await LiveUser.findOneAndUpdate(
          { liveStreamingId: liveStreamingId },
          {
            $push: {
              blockedUsers: {
                blockedUserId: blockedUserId,
              },
            },
          },
          { new: true },
        ).populate({
          path: "blockedUsers.blockedUserId",
          select: "name username image",
        });

        console.log("Updated Live User Type block: ", updatedLiveUser?.blockedUsers);

        io.in(liveStreamingId).emit("blockedListUpdated", updatedLiveUser?.blockedUsers);
        io.in("globalRoom:" + data.blockedUserId.toString()).emit("blockUserAlert", "Success");
      }

      if (type.trim().toLowerCase() === "unblock") {
        const updatedLiveUser = await LiveUser.findOneAndUpdate(
          { liveStreamingId: liveStreamingId },
          {
            $pull: {
              blockedUsers: {
                blockedUserId: blockedUserId,
              },
            },
          },
          { new: true },
        );

        console.log("Updated Live User Type unblock: ", updatedLiveUser);
      }
    } catch (error) {
      console.error("Error handling updateBlockedList event: ", error);
    }
  });

  socket.on("liveBlocklistUpdated", async (data) => {
    console.log("liveBlocklistUpdated data:  ", data);

    try {
      const { liveStreamingId } = data;

      const xyz = io.sockets.adapter.rooms.get(liveStreamingId);
      console.log(`adapter sockets in liveBlocklistUpdated ==================: `, xyz);

      const updatedLiveUser = await LiveUser.findOneAndUpdate({ liveStreamingId: liveStreamingId }).populate({
        path: "blockedUsers.blockedUserId",
        select: "name username image",
      });

      console.log("Updated Live User Type block: ", updatedLiveUser?.blockedUsers);

      io.in(liveStreamingId).emit("blockedListUpdated", updatedLiveUser?.blockedUsers);
    } catch (error) {
      console.error("Error handling liveBlocklistUpdated event: ", error);
    }
  });

  socket.on("speaking", async (data_) => {
    console.log("data in speaking: ", data_); //liveUserMongoId,agoraUid.isspeaking,liveStreamingId,userId

    const data = JSON.parse(data_);
    console.log("parsed data in speaking: ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in speaking");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in speaking ==================: ", xyz);

    await LiveUser.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(data.liveUserMongoId),
        "seat.agoraUid": data.agoraUID,
      },
      {
        $set: {
          "seat.$.isSpeaking": data.isSpeaking,
        },
      },
      {
        new: true,
      },
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
  });

  socket.on("declineInvite", async (data) => {
    console.log("data in declineInvite:   ", data);

    await LiveStreamingHistory.findById(data.liveStreamingId);

    const socket1 = await io.in("globalRoom:" + data.userId).fetchSockets();
    socket1?.length ? socket1[0].join(data.liveStreamingId) : console.log("socket1 not able to join in declineInvite");

    const xyz = io.sockets.adapter.rooms.get(data.liveStreamingId);
    console.log("adapter sockets in declineInvite ==================: ", xyz);

    const liveUser = await LiveUser.findOneAndUpdate(
      { _id: data.liveUserMongoId, "seat.position": data.position },
      {
        $set: {
          "seat.$.userId": null,
          "seat.$.image": null,
          "seat.$.name": null,
          "seat.$.avatarFrameImage": null,
          "seat.$.country": null,
          "seat.$.agoraUid": null,
          "seat.$.mute": 0,
          "seat.$.lock": false,
          "seat.$.reserved": false,
          "seat.$.invite": false,
        },
      },
      {
        new: true,
      },
    );

    const _liveUser = await LiveUser.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(data.liveUserMongoId) },
      },
      { $addFields: { view: { $size: "$view" } } },
    ]);

    io.in(data.liveStreamingId).emit("seat", _liveUser[0], null);
  });

  //chat
  socket.on("chat", async (data) => {
    console.log("data in chat:  ", data);

    const chatTopic = await ChatTopic.findById(data.topic).populate("receiverUser senderUser");
    if (data.messageType === "message") {
      let senderUserIdRoom = "globalRoom:" + chatTopic?.senderUser?._id.toString();
      let receiverIdRoom = "globalRoom:" + chatTopic?.receiverUser?._id.toString();

      if (chatTopic) {
        const chat = new Chat();
        chat.senderId = data.senderId;
        chat.messageType = "message";
        chat.message = data.message;
        chat.image = null;
        chat.topic = chatTopic._id;
        chat.date = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });

        chatTopic.chat = chat._id;

        await Promise.all([chat.save(), chatTopic.save()]);

        io.in(senderUserIdRoom).emit("chat", data);
        io.in(receiverIdRoom).emit("chat", data);

        let receiverUser, senderUser;
        if (chatTopic.senderUser && chatTopic.senderUser._id.toString() === data.senderId.toString()) {
          receiverUser = chatTopic.receiverUser;
          senderUser = chatTopic.senderUser;
        } else if (chatTopic.receiverUser && chatTopic.receiverUser._id) {
          receiverUser = chatTopic.senderUser;
          senderUser = chatTopic.receiverUser;
        }

        console.log("receiverUser: ", receiverUser);

        if (receiverUser && !receiverUser.isBlock && receiverUser.notification.message && !receiverUser.fcmToken !== null) {
          const adminPromise = await admin;

          const payload = {
            token: receiverUser.fcmToken,
            notification: {
              body: chat.message,
              title: senderUser.name,
            },
            data: {
              data: JSON.stringify({
                topic: chatTopic._id,
                message: chat.message,
                date: chat.date,
                chatDate: chat.date,
                userId: senderUser._id,
                name: senderUser.name,
                username: senderUser.username,
                image: senderUser.image,
                country: senderUser.country,
                isVIP: senderUser.isVIP,
                time: "Just Now",
              }),
              type: "MESSAGE",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message:      ", error);
            });
        }
      }
    } else {
      io.in("globalRoom:" + chatTopic.senderUser._id.toString()).emit("chat", data);
      io.in("globalRoom:" + chatTopic.receiverUser._id.toString()).emit("chat", data);
    }
  });

  socket.on("chatOrCallGiftSent", async (data) => {
    const parseData = data;
    console.log("🎁 Data in chatOrCallGiftSent:", parseData);

    const [sender, receiver, chatTopic, gift] = await Promise.all([
      User.findById(parseData?.senderId).lean().select("_id name diamond"),
      User.findById(parseData?.receiverId).lean().select("_id name fcmToken isBlock isHost rCoin currentCoin hostAgency"),
      ChatTopic.findById(parseData?.chatTopicId).lean().select("_id senderUser receiverUser chat"),
      Gift.findById(parseData?.giftId).lean().select("_id coin image svgaImage type"),
    ]);

    if (!gift || !sender || !receiver) {
      console.log("❌ Required data not found (gift/sender/receiver)");
      io.in("globalRoom:" + chatTopic?.senderUser?.toString()).emit("insufficientCoins", "❌ Required data not found (gift/sender/receiver)");
      return;
    }

    const giftPrice = gift?.coin || 0;
    const giftCount = parseData?.giftCount || 1;
    const totalGiftCost = giftPrice * giftCount;

    if ((sender?.diamond || 0) < totalGiftCost) {
      console.log("❌ Insufficient coins, gift not sent.");
      io.in("globalRoom:" + chatTopic?.senderUser?.toString()).emit("insufficientCoins", "Insufficient coins to send gift.");
      return;
    }

    const eventType = parseData?.eventType === "call" ? "callGift" : "chatGift";
    const walletType = parseData?.eventType === "call" ? 19 : 18;

    const newChat = new Chat({
      messageType: eventType,
      message: `🎁 ${sender.name} sent a gift`,
      giftImage: gift.image || "",
      giftsvgaImage: gift.svgaImage || "",
      giftType: gift?.type,
      senderId: sender?._id,
      topic: chatTopic?._id,
      giftCount,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    });

    await Promise.all([newChat.save(), ChatTopic.updateOne({ _id: chatTopic?._id }, { $set: { chat: newChat?._id } })]);

    const eventData = {
      data,
      messageId: newChat._id.toString(),
    };

    io.in("globalRoom:" + parseData?.senderId?.toString()).emit("chatOrCallGiftSent", eventData);
    io.in("globalRoom:" + parseData?.receiverId?.toString()).emit("chatOrCallGiftSent", eventData);

    const walletTransactions = [
      Wallet.create({
        userId: sender._id,
        diamond: totalGiftCost,
        type: walletType,
        isIncome: false,
        otherUserId: receiver._id,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
      Wallet.create({
        userId: receiver._id,
        rCoin: totalGiftCost,
        type: walletType,
        isIncome: true,
        otherUserId: sender._id,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        parentAgencyId: receiver?.isHost ? receiver?.hostAgency : null,
      }),
    ];

    const userUpdates = [User.updateOne({ _id: sender._id, diamond: { $gte: totalGiftCost } }, { $inc: { diamond: -totalGiftCost, spentCoin: totalGiftCost } })];

    if (receiver.isHost) {
      const agency = await Agency.findById(receiver.hostAgency);

      const agencyCommissionAmount = agency ? Math.floor((totalGiftCost * (settingJSON?.agencyCommission || 0)) / 100) : 0;

      userUpdates.push(User.updateOne({ _id: receiver._id }, { $inc: { rCoin: totalGiftCost, currentCoin: totalGiftCost } }));

      if (agency) {
        const agencyWallet = new Wallet({
          agencyId: agency._id,
          rCoin: agencyCommissionAmount,
          type: 17,
          isIncome: true,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          otherUserId: receiver._id,
          parentBdId: agency.bd || null,
        });

        await Promise.all([
          Agency.updateOne(
            { _id: agency._id },
            {
              $inc: {
                currentCoin: agencyCommissionAmount,
                currentHostCoin: totalGiftCost,
                rCoin: agencyCommissionAmount,
              },
            },
          ),
          agencyWallet.save(),
        ]);

        //BD commission
        if (agency.bd) {
          const bd = await Bd.findById(agency.bd);
          if (bd && bd.isActive) {
            const bdCommissionAmount = Math.floor((agencyCommissionAmount * (bd?.bdCommission || 0)) / 100);
            if (bdCommissionAmount > 0) {
              const bdWallet = new Wallet({
                bdId: bd._id,
                rCoin: bdCommissionAmount,
                type: 21,
                isIncome: true,
                date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
                otherAgencyId: agency._id,
              });
              await Promise.all([Bd.updateOne({ _id: bd._id }, { $inc: { rCoin: bdCommissionAmount, netCoin: bdCommissionAmount } }), bdWallet.save()]);
            }
          }
        }
      }
    } else {
      userUpdates.push(User.updateOne({ _id: receiver._id }, { $inc: { rCoin: totalGiftCost } }));
    }

    await Promise.all([...userUpdates, ...walletTransactions]);

    console.log(`✅ ${eventType} sent | Cost: ${totalGiftCost} coins`);

    if (!receiver.isBlock && receiver.fcmToken) {
      const payload = {
        token: receiver.fcmToken,
        notification: {
          title: `${sender.name} sent you a gift 🎁`,
          body: `💝 You received ${giftCount} gifts worth ${totalGiftCost} coins!`,
        },
        data: {
          data: JSON.stringify({
            topic: chatTopic._id,
          }),
          type: "GIFT",
        },
      };

      try {
        const adminInstance = await admin;
        const response = await adminInstance.messaging().send(payload);
        console.log("✅ FCM sent:", response);
      } catch (error) {
        console.log("❌ FCM Error:", error);
      }
    }
  });

  socket.on("messageReadStatus", async (data) => {
    try {
      console.log("Data in messageReadStatus event:", data);

      const updated = await Chat.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(data.messageId) }, { $set: { isRead: true } }, { new: true });

      if (!updated) {
        console.log(`No message found with ID ${data.messageId}`);
      } else {
        console.log(`Updated isRead to true for message with ID: ${updated._id}`);
      }
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  });

  //call
  socket.on("callRequest", async (data) => {
    console.log("callRequest data: ", data);

    io.in("globalRoom:" + data.userId1).emit("callRequest", data); // userId1 = receiver user , userId2 = caller user
  });

  socket.on("callConfirmed", (data) => {
    console.log("callConfirmed data: ", data);

    io.in("globalRoom:" + data.userId2).emit("callConfirmed", data); // userId1 = receiver user , userId2 = caller user
  });

  socket.on("callAnswer", async (data) => {
    console.log("callAnswer data: ", data);

    if (data.isAccept) {
      const socket1 = await io.in("globalRoom:" + data.userId1).fetchSockets();
      socket1?.length ? socket1[0].join(data.callRoomId) : console.log("socket1 not able to emit");

      const socket2 = await io.in("globalRoom:" + data.userId2).fetchSockets();
      socket2?.length ? socket2[0].join(data.callRoomId) : console.log("socket1 not able to emit");
    } else {
      const topic = await getOrCreateChatTopic(data.userId2, data.userId1);

      await Chat.findOneAndUpdate(
        { callId: data.callRoomId },
        {
          $setOnInsert: {
            callId: data.callRoomId,
            topic: topic._id,
            senderId: data.userId2, // caller
            messageType: `${data.callType === 1 ? "Audio" : "Video"} call`,
            message: `${data.callType === 1 ? "📞 Audio" : "📽 Video"} Call Declined`,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            callType: data.callType,
            callStatus: 2, // Declined call
            callerId: data.userId2,
            receiverId: data.userId1,
            callerCoinCharged: 0,
            receiverCoinEarned: 0,
            callDuration: "00:00:00",
          },
        },
        { upsert: true },
      );

      await User.updateMany({ callId: data.callRoomId }, { $set: { callId: "" } });
    }

    io.in("globalRoom:" + data.userId2).emit("callAnswer", data); // userId1 = receiver user , userId2 = caller user
  });

  socket.on("callReceive", async (data) => {
    console.log("callReceive data: ", data);

    let [callDetail, setting] = await Promise.all([Wallet.findById(data?.callId), Setting.findOne({}).lean()]);

    if (!callDetail) {
      callDetail = await Wallet.findById(data.callId);
    }

    if (callDetail) {
      const [user, receiver] = await Promise.all([User.findById(callDetail.userId).populate("level liveJoinSvga avatarFrame"), User.findById(callDetail.otherUserId)]);

      let coin = parseInt(data.coin);
      if (isNaN(coin) || coin <= 0) {
        console.log("Invalid coin value:", coin);
        return io.in(data?.callId).emit("callReceive", null, "Invalid coin value");
      }

      // const receiverShare = coin * (setting?.callReceiverPercent / 100);
      const receiverShare = coin * ((setting?.callReceiverPercent ?? 10) / 100);
      const remainingShare = coin - receiverShare;

      if (user && user.diamond >= coin) {
        callDetail.diamond += coin;
        // callDetail.rCoin += receiverShare;
        callDetail.callConnect = true;
        if (!callDetail.callStartTime) {
          callDetail.callStartTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        }
        callDetail.callEndTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

        user.diamond -= coin;
        user.spentCoin += coin;

        const topic = await getOrCreateChatTopic(callDetail.userId, callDetail.otherUserId);

        await Chat.findOneAndUpdate(
          { callId: data.callId },
          {
            $setOnInsert: {
              callId: data.callId,
              topic: topic._id,
              senderId: callDetail.userId,
              messageType: `${data.callType === 1 ? "Audio" : "Video"} call`,
              message: `${data.callType === 1 ? "📞 Audio" : "📽 Video"} Call Received`,
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
              callType: data.callType,
              callStatus: 1, // Receive call
              callerId: callDetail.userId,
              receiverId: callDetail.otherUserId,
              callDuration: "00:00:00",
            },
            $inc: {
              callerCoinCharged: coin,
              receiverCoinEarned: receiverShare,
            },
          },
          { upsert: true },
        );

        if (receiver.isHost) {
          receiver.rCoin += receiverShare;
          receiver.currentCoin += receiverShare;

          const agencyId = receiver?.hostAgency;
          const agency = await Agency.findOne({ _id: agencyId });

          if (agency) {
            console.log("Agency under which host (when call receive):  ", agency);

            agency.currentHostCoin += parseInt(data.coin);

            const agencyCommissionAmount = (parseInt(data.coin) * settingJSON.agencyCommission) / 100;
            agency.currentCoin += agencyCommissionAmount;
            agency.rCoin += agencyCommissionAmount;

            const history = new Wallet({
              agencyId: agencyId,
              rCoin: agencyCommissionAmount,
              type: 17,
              isIncome: true,
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
              otherUserId: receiver._id,
              parentBdId: agency.bd || null,
            });

            await Promise.all([agency.save(), history.save()]);

            //BD commission
            if (agency.bd) {
              const bd = await Bd.findById(agency.bd);
              if (bd && bd.isActive) {
                const bdCommissionAmount = Math.floor((parseInt(agencyCommissionAmount) * (bd?.bdCommission || 0)) / 100);
                if (bdCommissionAmount > 0) {
                  const bdHistory = new Wallet({
                    bdId: bd._id,
                    rCoin: bdCommissionAmount,
                    type: 21,
                    isIncome: true,
                    date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
                    otherAgencyId: agency._id,
                  });
                  await Promise.all([Bd.updateOne({ _id: bd._id }, { $inc: { rCoin: bdCommissionAmount, netCoin: bdCommissionAmount } }), bdHistory.save()]);
                }
              }
            }
          }
        } else {
          receiver.rCoin += receiverShare;
        }

        if (isNaN(receiver.rCoin) || receiver.rCoin < 0) {
          console.log("Invalid rCoin value for receiver:", receiver.rCoin);
          return io.in(data?.callId).emit("callReceive", null, "Invalid rCoin value for receiver");
        }

        const historyData = [
          // {
          //   userId: user._id,
          //   diamond: coin,
          //   type: 13,
          //   isIncome: false,
          //   otherUserId: receiver._id,
          //   date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          // },
          {
            userId: receiver._id,
            rCoin: receiverShare,
            type: 13,
            isIncome: true,
            otherUserId: user._id,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            parentAgencyId: receiver?.isHost ? receiver?.hostAgency : null,
          },
        ];

        await Promise.all([user.save(), receiver.save(), callDetail.save(), Wallet.insertMany(historyData)]);

        io.in(data?.callId).emit("callReceive", user?.name);
      } else {
        io.in(data?.callId).emit("callReceive", null, user);
      }
    }
  });

  socket.on("callCancel", async (data) => {
    console.log("call Cancelled data: ", data);

    const user1 = await User.findById(data?.userId1);
    if (user1) {
      user1.callId = "";
      await user1.save();
    }
    const user2 = await User.findById(data?.userId2);
    if (user2) {
      user2.callId = "";
      await user2.save();
    }

    const topic = await getOrCreateChatTopic(data.userId2, data.userId1);

    await Chat.findOneAndUpdate(
      { callId: data.callId },
      {
        $setOnInsert: {
          callId: data.callId,
          topic: topic._id,
          senderId: data.userId2,
          messageType: `${data.callType === 1 ? "Audio" : "Video"} call`,
          message: `Missed ${data.callType === 1 ? "📞 Audio" : "📽 Video"} Call`,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          callType: data.callType,
          callStatus: 3, // Missed call
          callerId: data.userId2,
          receiverId: data.userId1,
          callDuration: "00:00:00",
        },
      },
      { upsert: true },
    );

    io.in("globalRoom:" + data.userId1).emit("callCancel", data); // userId1 = receiver user , userId2 = caller user
  }); //when user decline the call

  socket.on("callDisconnect", async (callId) => {
    console.log("Call disconnect: ", callId);
    await User.updateMany({ callId: callId }, { $set: { callId: "" } });

    const callHistory = await Wallet.findById(callId);
    if (callHistory) {
      callHistory.callEndTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await callHistory.save();
    }

    const topic = await getOrCreateChatTopic(callHistory.userId, callHistory.otherUserId);

    const chat = await Chat.findOne({ callId });

    if (chat && chat.callStatus === 1) {
      const start = new Date(callHistory.callStartTime);
      const end = new Date();
      const seconds = Math.floor((end - start) / 1000);

      chat.callDuration = formatDuration(seconds);
      await chat.save();
    }
  });

  socket.on("userCoinUpdate", async (data) => {
    console.log("userCoinUpdate data:  ", data);

    const user = await User.findById(data);

    io.in("globalRoom:" + data).emit("userCoinUpdate", parseInt(user.diamond));
  });

  socket.on("disconnect", async () => {
    console.log("One of sockets disconnected from our server ================= ", globalRoom);

    if (globalRoom) {
      const socket1 = await io.in(globalRoom).fetchSockets();

      if (socket1?.length == 0) {
        await offlineUser(id);

        //Normal Live
        const liveUser = await LiveUser.findOne({ liveUserId: id, audio: false });

        if (liveUser) {
          if (liveUser.liveStreamingId) {
            io.in(liveUser?.liveStreamingId.toString()).emit("liveHostEnd", liveUser?.liveStreamingId);
            io.socketsLeave(liveUser?.liveStreamingId.toString());
          }

          await liveUser.deleteOne();

          const liveStreamingHistory = await LiveStreamingHistory.findOne({ _id: liveUser?.liveStreamingId });
          if (liveStreamingHistory && liveStreamingHistory.duration !== "00:00:00") {
            liveStreamingHistory.endTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            liveStreamingHistory.momentEndTime = moment(new Date()).format("HH:mm:ss");

            var date1 = moment(liveStreamingHistory.momentStartTime, "HH:mm:ss");
            var date2 = moment(liveStreamingHistory.momentEndTime, "HH:mm:ss");
            var timeDifference = date2.diff(date1);
            var duration = moment.duration(timeDifference);
            var durationTime = moment.utc(duration.asMilliseconds()).format("HH:mm:ss");

            liveStreamingHistory.duration = durationTime == "Invalid date" ? "00:00:00" : durationTime;
            await liveStreamingHistory.save();
          }
        } else {
          const updatedViewUser = await LiveUser.findOneAndUpdate(
            {
              audio: true,
              $or: [
                { isHostExists: true },
                { seat: { $elemMatch: { userId: { $ne: null } } } }, // if any user is available in the seat
              ],
              view: { $elemMatch: { userId: id.toString(), isAdd: true } },
            },
            {
              $set: { "view.$.isAdd": false },
            },
            { new: true },
          );

          if (updatedViewUser) {
            //console.log("Updated View User:", updatedViewUser);

            const liveRoomId = updatedViewUser?.liveStreamingId?.toString();
            const roomUsers = io.sockets.adapter.rooms.get(liveRoomId);
            console.log("Live Streaming Room:", roomUsers);

            io.in(liveRoomId).emit("view", updatedViewUser.view || [], null);
          }

          //when user disconnect and if that user on the seat then leave also from seat
          const liveUserSeatUpdate = await LiveUser.findOneAndUpdate(
            { "seat.userId": id },
            {
              $set: {
                "seat.$.userId": null,
                "seat.$.image": null,
                "seat.$.name": null,
                "seat.$.avatarFrameImage": null,
                "seat.$.country": null,
                "seat.$.agoraUid": null,
                "seat.$.mute": 0,
                "seat.$.lock": false,
                "seat.$.reserved": false,
                "seat.$.invite": false,
              },
            },
            {
              new: true,
            },
          );

          if (liveUserSeatUpdate) {
            console.log("seat emit in main disconnect");

            io.in(liveUserSeatUpdate?.liveStreamingId.toString()).emit(
              "seat",
              {
                ...liveUserSeatUpdate?._doc,
                view: liveUserSeatUpdate?.view?.length,
              },
              null,
            );
          }
        }

        const user = await User.findById(id);
        if (user && user.callId) {
          const callHistory = await Wallet.findById(user.callId);
          if (callHistory && callHistory.callEndTime == null) {
            callHistory.callEndTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            await callHistory.save();
          }

          await User.updateMany({ callId: user.callId }, { $set: { callId: "" } });
        }
      }
    }
  });
});
