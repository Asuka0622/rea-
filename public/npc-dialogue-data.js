// Derived from docs/world/npc-life-dialogue-2026-10-18.json; profiles only, not NPC movement.
export const NPC_DIALOGUE_PROFILES = [
  {
    "id": "baker",
    "name": "阿桃",
    "dialogues": [
      {
        "id": "baker.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "炉子先醒，我随后。等一会儿就有第一盘。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "面包刚摆好，袋口别系太紧，还热着。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "这会儿人少，我正好把明早的面称出来。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "最后一盘出炉了。你慢慢挑，我先收托盘。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "店里已经收好了，有事在门口叫我就行。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "先别站雨里，门口这筐我搬进去再跟你说。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "檐下还有位置。面包袋靠里面放，别贴着湿边。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了，我看看门口能不能把筐摆回去。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "风把面粉吹得到处跑，今天就在里面揉。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "雪天托盘凉得快，拿的时候我给你垫块布。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天我想试一种带花香的面包，先烤小小一盘。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天发面快，我可不敢离开炉子太久。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "南瓜到了，这几天店里都是甜香。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天守着炉子挺暖和，门也别一直敞着。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你先看，我手上的面还没揉完。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "baker.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "今天不用帮忙，坐一会儿也行。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "watchmaker",
    "name": "老魏",
    "dialogues": [
      {
        "id": "watchmaker.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "先别说哪里坏，我听一会儿。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "表放软垫上，别碰那盘小零件。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "我歇歇眼睛，再看这根游丝。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "光暗了，今天不拆更小的东西。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "摊收了。真着急的，明早我先看。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "这盘零件得先盖起来，别让雨点进来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "棚里干燥，表放这块布上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "等桌面干了再开盘，不急这一刻。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "风里别开零件盒，一颗螺丝都难找。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "手指僵的时候不碰游丝，先进屋暖暖。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天我把旧零件重新分一遍。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天戴表出汗，表带也得记得擦。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "这光不刺眼，正适合看看细处。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "厚袖子容易勾住表冠，戴的时候留点神。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "准不准，得先知道你拿什么来比。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "watchmaker.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我这儿可以慢慢看，不用急着下结论。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "student",
    "name": "小满",
    "dialogues": [
      {
        "id": "student.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "我书包检查过了……应该没有落东西。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.morning",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "morning"
        },
        "text": "现在还没放学，有事可以留到放学后。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "这页我想画成图，看着比一整段字清楚。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "我先把这一段写完，再出来。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "这么晚我就不出门了，明天见。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "本子先收起来。纸湿了，字就全挤一块儿了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "这儿淋不到，我等雨小一点再走。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "我先看看椅子干没干，不能直接坐。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "翻到哪页就给我吹到哪页，书签都没用。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "路边的雪我只踩脚印，不去结冰的边上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "院子里开花了，我想画到笔记封面上。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天白昼长，总觉得还能再看一页。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "这片叶子像只小手，我想夹在书里。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "厚外套口袋多，反倒总找不到橡皮。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你先别看，我还没改好。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "student.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "这回我想先自己试，卡住了再问。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "disk-vendor",
    "name": "阿飞",
    "dialogues": [
      {
        "id": "disk-vendor.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "先把标签贴好，免得又拿错箱。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "只看外壳随便看，里面的资料不能随便翻。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "这箱还没处理完，今天先不卖。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "收摊得数两遍，不然明天又找半天。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "箱子都锁好了，明天再挑吧。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "盘怕水，我先把箱盖扣上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "先站棚里。箱子也别挡着人家过路。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "地面干了再落箱，别急着摆。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "我得把标签压住，别又飞成一摊谜题。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "今天不把盘放地上，箱底都凉透了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天收拾旧物的人多，来源更要记清。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天箱子不能晒着，棚里也得留点通风。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "落叶别扫进箱，我还以为多了一张标签。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "手套摘了再碰接口，别把小东西掉雪里。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "容量是一回事，来路是另一回事。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "disk-vendor.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你问清楚再买，我也少一桩糊涂账。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "barista",
    "name": "小鹿",
    "dialogues": [
      {
        "id": "barista.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "还在磨第一壶豆子，您先坐。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "您想坐窗边还是里面？我先把杯垫放好。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "下午想安静些的话，这边的位子空着。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "我把外面的椅子收一收，里面还能坐一会儿。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "打烊了，明天再给您留一杯。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "先把门外的椅子搬进来，别让下一位坐到湿的。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "窗边能听见雨打棚顶，您愿意坐这儿吗？",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了，我先擦干门口那两把椅子。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "菜单总被吹翻，我给它换个重一点的夹子。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "您先暖暖手，湿围巾可以放旁边。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天的花我只摆一小枝，别挡了窗外。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天我会多备些凉水，进门先歇歇。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天的阳光落在这张桌上，待一会儿挺舒服。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天杯垫凉得快，我给您换一块干的。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我再核对一次，免得把您的杯子拿错。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "barista.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "不点东西也可以坐一下，别急。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "parcel",
    "name": "大壮",
    "dialogues": [
      {
        "id": "parcel.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "第一车到了，先给大家留条走路的地方。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "取件码你自己给我看，不用念出来。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "这会儿空一点，我把大箱子挪低。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "还有几件没取，我把通知再核一遍。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "站关了。急件按门口写的联系方式问，别拆柜子。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "大箱子先到檐下，过道得空出来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "你站干的地方等，我把那件递过来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了也别把纸箱直接放地上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "这张单我先压好，别让它吹到别人的箱上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "门前雪我先扫开，搬箱子不能踩滑。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天寄花苗的多，朝上标记得留着。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天大家来得晚些，柜格还是得及时腾。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天寄来的箱子上常沾着叶子。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天手套一厚，小取件单真不好捏。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我认的是编号，不猜里面是什么。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "parcel.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "别挤在柜门前，给后面的人留点地方。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "pigeon-uncle",
    "name": "老周",
    "dialogues": [
      {
        "id": "pigeon-uncle.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "今儿我来得早，它们倒还没到齐。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "你看那只，走两步就回头看看。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "我坐一会儿。你忙你的，不用陪我。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "我得回去了，明天再看这群小家伙。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "我已经歇下了，有事明早来吧。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "雨大了，今天就不往广场中间走。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "鸽子也躲雨去了，我就在檐下坐会儿。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "等椅子干了我再过去，不急。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "风把帽檐掀起来，倒比我还精神。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "雪地里脚印多，慢慢看也挺有意思。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天这群小家伙吵得最有劲。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天我挑树荫坐，鸟也懂得找凉快。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "叶子一落，树上的鸟倒看得更清楚了。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天出来走一小圈，活动开就回去。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "镇上有些事，坐一会儿才看得见。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "pigeon-uncle.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你不用每次经过都找我说话，我认得你。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "oncall",
    "name": "阿康",
    "dialogues": [
      {
        "id": "oncall.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "它比闹钟准，天一亮就来叫我。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "我先看完这条消息，别又把真有事的按掉。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "屏幕看久了，出来转一圈。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "今天这圈走完就回去，它也该歇了。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "还在值班，没急事我就先不出来了。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "我把遛弯这圈缩短点，别在雨里磨蹭。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "我们都在檐下歇会儿，等雨小些。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "路还湿着，它非得绕着水洼走。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "它的耳朵都吹翻了，咱们换条背风的路。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "回来得擦脚，不然屋里全是小脚印。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天它每走三步就要闻一闻。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天遛弯挑早晚，正午就先歇着。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天它总追着落叶跑，跑完还装没看见。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天这圈走短些，别让它在外面等我。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "提示响不等于出事，但也不能一概按掉。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "oncall.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "手机先收口袋里，我看着路走。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "paperboy",
    "name": "小石头",
    "dialogues": [
      {
        "id": "paperboy.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "这摞送东边，这摞送西边，可不能拎反。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "最后两家送完，我就能歇一口气。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "报袋轻了，肩膀都跟着轻了。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "今天不加送啦，我把袋子收好就走。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "报纸得明早才有，今晚先睡吧。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "报纸收里头，外边这一层我先包起来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "雨没小，我先在这儿重新数份数。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "棚顶还滴水，报袋不能贴墙放。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "你看着这摞，我去把吹走的绳头拿回来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "雪路慢点走也行，报纸别送错门就好。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天送报一路都能闻见花香。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天纸晒久了卷边，我都往阴处放。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天一脚一片叶子，听着像翻报纸。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天戴手套分报，得比平时更仔细。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "新闻是哪天的，先看日期。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "paperboy.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我跑的地方多，可不知道别人家里的事。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "lighthouse-keeper",
    "name": "老陈",
    "dialogues": [
      {
        "id": "lighthouse-keeper.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "灯罩先擦一遍，晚上才看得清。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "我去看看护栏，你走内侧。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "记录写完了，灯的事还得再核一遍。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "天色在暗，准备亮灯。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "我在灯塔里。有事敲门，别往栈桥外头找。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "先离水边远些，我把巡检本收好。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "门廊里等。雨声大，说话得靠近一点。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了，栏杆还湿，先别扶着探出去。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "风大，不往外头走；灯我在里面检查。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "先清门口这点雪，再去看灯罩。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天水边热闹，巡查时也得看脚下。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天天黑晚，灯该查还是得查。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天的风换了方向，我记在本上了。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬夜长，备灯前多核一遍。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "没看见的事，我不替它担保。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lighthouse-keeper.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "灯罩干净，灯芯也得好使。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "apprentice",
    "name": "小铃",
    "dialogues": [
      {
        "id": "apprentice.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "工具摆齐了，少哪一件一眼就能看见。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "你先看，我把这次的读数记下来。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "我拿同一只表再比一遍，免得比法就不一样。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "今天差在哪儿，我想睡前先记清。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "工具已经锁好了，明天再试，不赶这一会儿。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "先盖零件盘！那颗小螺丝最怕找不回来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "棚里没淋到，记录本也先合上。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "等桌面擦干再摆工具，别只看天晴了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "我用夹子压着图纸，手就能腾出来了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "手暖了再拿镊子，不然夹不稳。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天我想给工具架重新画个位置图。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天窗开着，纸边都得压好。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天这光适合抄图，我再看一页。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天先把手暖好，精细活急不得。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我不确定的时候，就再量一次。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "apprentice.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "师傅有时候也会看错，我们一起核。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "cobbler",
    "name": "老宋",
    "dialogues": [
      {
        "id": "cobbler.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "鞋楦摆出来了，你先坐。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "这双等胶干，不催它。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "脚走累了就歇，鞋也是这个道理。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "取鞋别急，我把左右再核一遍。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "铺子收了，明天来我还在。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "先别踩门口那块松砖，雨天容易滑。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "鞋放檐里。你站着歇也行，坐着歇也行。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了鞋也没立刻干，别急着往炉边烤。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "皮屑我先扫掉，省得吹到门口。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "鞋底沾雪，进门先蹭一蹭。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天路上泥多，回来擦干净就好。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天鞋要透气，也别一直湿着。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天好走路，磨破了再来补。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天厚袜子穿上再量，省得鞋挤。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我看的是眼前这双鞋，不猜你的去处。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "cobbler.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "修得住，就不急着换。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "duoduo",
    "name": "朵朵",
    "dialogues": [
      {
        "id": "duoduo.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "我先看看昨晚记的那一页。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "花先浇好，再去看掌机。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "这会儿光正好，屏幕也看得清。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "我把小院收一下，等会儿就进屋。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "我已经进屋了，有事明天再慢慢说。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "掌机先收起来，不能让它淋着。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "这里淋不到，等一会儿再出门。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "花盆底下还有水，我先不添了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "我得把那盆苗挪进去，叶子都吹歪了。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "院子边的雪先别踩，我想看看明早的样子。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天总想多种一点，地方又只有这么大。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天傍晚浇花，水就没那么快晒干。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天的种子我都分袋装好了。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天小院安静，我就在屋里整理记录。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "我想把看见的和记下的对一对。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "duoduo.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你慢慢查，我先忙自己的。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "wang-nainai",
    "name": "王奶奶",
    "dialogues": [
      {
        "id": "wang-nainai.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "孩子，起得早呀。我把窗台擦一擦。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "坐一会儿？我正好歇歇脚。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "我把屋里收拾完了，出来透透气。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "天暗了，我先把晾着的东西收回去。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "孩子，我已经歇下了，没急事明天说。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "孩子，先帮自己找个干地方站，别急着说话。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "檐下够站，别往外挤。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停了也慢点走，门前还滑呢。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "我先把窗关上，你说话我听着呢。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "台阶我扫过了，雪天还是慢些走。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天我喜欢把窗台腾一点给花。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天这会儿坐着歇歇，别老在日头下跑。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天的衣服收得早，傍晚露水重。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天出门把领口拢好，孩子。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你说得明白，我才能自己拿主意。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "wang-nainai.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "不懂我就再问一遍，不怕麻烦。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "lao-qin",
    "name": "老秦",
    "dialogues": [
      {
        "id": "lao-qin.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "先让屋里透透气，纸也闷了一夜。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "看哪一盒？先查目录，不直接翻。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "我歇歇眼，封套还得补几只。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "借出的先核一遍，再关柜。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "档案馆关门了，明早我替你找目录。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "纸箱先离门口远些，湿气会慢慢爬进去。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "你在檐下等等，我把这一摞放回柜里。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "地面还潮，箱子不能直接放下。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "我先关窗，旧纸经不起这么吹。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "鞋底雪蹭干净再进来，纸可受不住。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天我给封套换一批干净的。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天屋里要透气，也不能让太阳直晒。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天整理旧物的人多，来源一项不能省。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天翻页慢些，旧纸脆。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "不知道，就先写不知道。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "lao-qin.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "留着，不等于已经看懂；扔掉，也不等于从没存在。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  },
  {
    "id": "smith-release",
    "name": "铁叔",
    "dialogues": [
      {
        "id": "smith-release.dawn",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "dawn"
        },
        "text": "先把台面腾出来，今天就好干活。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.morning",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "morning"
        },
        "text": "你站这边看，别挡着我手上的尺。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.afternoon",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "afternoon"
        },
        "text": "量两遍不丢人，少量一遍才容易返工。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.evening",
        "kind": "time",
        "channel": "talk",
        "when": {
          "timeBand": "evening"
        },
        "text": "工具归位了，明天就不用满屋找。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.night",
        "kind": "time",
        "channel": "door-response",
        "when": {
          "timeBand": "night"
        },
        "text": "铺子收了，明天咱们接着试。",
        "weight": 30,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.rain-exposed",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": "exposed"
        },
        "text": "图纸收里面，手上的活先放稳。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.rain-sheltered",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "rain",
            "storm"
          ],
          "shelter": [
            "covered",
            "indoors"
          ]
        },
        "text": "檐下这块干，咱们在这儿说。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.rain-cleared",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": [
            "clear",
            "cloudy"
          ],
          "recentEvent": "rain-cleared",
          "withinGameMinutes": 30
        },
        "text": "雨停先擦台面，工具不急着搬出来。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.wind-strong",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "wind": "strong",
          "shelter": "exposed"
        },
        "text": "这张图得夹牢，省得风替我改尺寸。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.snow",
        "kind": "weather",
        "channel": "talk",
        "when": {
          "weather": "snow",
          "season": "winter"
        },
        "text": "先暖暖手，再碰精细的东西。",
        "weight": 50,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.spring",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "spring"
        },
        "text": "春天修理的活多，先把零件分好。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.summer",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "summer"
        },
        "text": "夏天忙一阵也得歇，别让手上打滑。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.autumn",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "autumn"
        },
        "text": "秋天把工具过一遍，坏的趁早补。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.winter",
        "kind": "season",
        "channel": "talk",
        "when": {
          "season": "winter"
        },
        "text": "冬天开工慢一点，稳当最要紧。",
        "weight": 15,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.idle-a",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "先看看它实际怎么做，再听它怎么说。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      },
      {
        "id": "smith-release.idle-b",
        "kind": "idle",
        "channel": "talk",
        "when": {},
        "text": "你来动手，我在旁边看着。",
        "weight": 5,
        "spoiler": "none",
        "oneShot": false
      }
    ]
  }
];

export const NPC_DIALOGUE_PORTRAITS = ["ada-happy","ada-normal","ada-surprised","ada-thinking","apprentice-happy","apprentice-normal","apprentice-thinking","archivist-happy","archivist-normal","archivist-surprised","archivist-thinking","azhe-happy","azhe-normal","azhe-surprised","azhe-thinking","babbage-happy","babbage-normal","babbage-surprised","babbage-thinking","baker-happy","baker-normal","baker-surprised","baker-thinking","barista-happy","barista-normal","barista-surprised","barista-thinking","cobbler-happy","cobbler-normal","cobbler-thinking","dev-flustered","dev-happy","dev-normal","dev-surprised","dev-thinking","disk-vendor-happy","disk-vendor-normal","disk-vendor-surprised","disk-vendor-thinking","duoduo-happy","duoduo-normal","duoduo-surprised","duoduo-thinking","grandma-happy","grandma-normal","grandma-surprised","grandma-thinking","kobayashi-happy","kobayashi-normal","kobayashi-surprised","kobayashi-thinking","lighthouse-keeper-happy","lighthouse-keeper-normal","lighthouse-keeper-thinking","lumi-happy","lumi-normal","lumi-point","lumi-surprised","lumi-thinking","oncall-happy","oncall-normal","oncall-thinking","paperboy-happy","paperboy-normal","paperboy-thinking","parcel-happy","parcel-normal","parcel-surprised","parcel-thinking","pigeon-uncle-happy","pigeon-uncle-normal","pigeon-uncle-thinking","qiushi-confident","qiushi-cornered","qiushi-normal","qiushi-surprised","qiushi-thinking","smith-happy","smith-normal","smith-surprised","smith-thinking","student-happy","student-normal","student-surprised","student-thinking","watchmaker-happy","watchmaker-normal","watchmaker-surprised","watchmaker-thinking","xiaoke-happy","xiaoke-normal","xiaoke-sorry","xiaoke-surprised","xiaoke-thinking","xiaoke-unsure","xiaoyu-happy","xiaoyu-normal","xiaoyu-surprised","xiaoyu-thinking","xingbo-guilty","xingbo-happy","xingbo-normal","xingbo-surprised","xingbo-thinking","zhoujie-happy","zhoujie-normal","zhoujie-surprised","zhoujie-thinking"];
