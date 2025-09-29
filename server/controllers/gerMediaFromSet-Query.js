 [
     {
          "$match": {
               "IsDeleted": 0,
               "Status": 1,
               "IsPrivate": {
                    "$ne": 1
               },
               "UploadedBy": "admin",
               "$or": [
                    {
                         "MediaType": "Link",
                         "LinkType": "image",
                         "IsUnsplashImage": true
                    },
                    {
                         "MediaType": "Image"
                    }
               ],
               "InAppropFlagCount": {
                    "$lt": 5
               },
               "MetaMetaTags": {
                    "$nin": [
                         "56e8fd4a7f69c9ca3d627fc6"
                    ]
               },
               "GroupTags.GroupTagID": {
                    "$in": [
                         "6105a371eff2685101297635",
                         "55b2654ee8837a284fdeca5e",
                         "55b26575e8837a284fdee6b6",
                         "5fadc46466b5302542a4a07b",
                         "54f440c46f95404053dd467d",
                         "5c7771e904b5774eafc5ca20",
                         "6105a371eff2685101298c87",
                         "6105a371eff26851012997b5",
                         "6105a371eff268510129989d",
                         "60f08f2c3209994a43b786f9",
                         "659a2f717c11011c03e23d9e",
                         "605b95aceb2c64338afa1c9f",
                         "6105a371eff2685101299c73",
                         "5c5d88057f322a2d3338b0f8",
                         "605b95adeb2c64338afa1cb5",
                         "55117d441cc8615862ab6e0f",
                         "55b25dc3e8837a284fde8ec3",
                         "55b267e1e8837a284fe19bf3",
                         "6105a371eff268510129acf7",
                         "605b95b5eb2c64338afa1d4d",
                         "605b95b5eb2c64338afa1d4f",
                         "605b95b5eb2c64338afa1d51",
                         "65714cf52dab355d455b53cf",
                         "60f08f2c3209994a43b786c1",
                         "5be03a6afa72b01657e5ad01",
                         "6105a371eff268510129c6de",
                         "5c5d87a37f322a2d333895f6",
                         "551182511cc8615862ab6eb8",
                         "6105a371eff268510129cb64",
                         "6105a371eff268510129d2a2",
                         "6105a371eff268510129d9ae",
                         "6105a371eff268510129dba2",
                         "6105a371eff268510129df0b",
                         "6105a371eff268510129eb34",
                         "6105a371eff268510129f1ab",
                         "605b96c5796fa533c84f0edc",
                         "5c5bbdabd960ee4bdefc3b53",
                         "5c5bbda9d960ee4bdefc21f7",
                         "65714d032dab355d455b540c",
                         "65714c932dab355d455b51df",
                         "5c407018c1d9bf444e5718c5",
                         "6105a371eff26851012a2d08",
                         "605b96db796fa533c84f10da",
                         "6105a371eff26851012a3c63",
                         "60f08f2c3209994a43b77baf",
                         "5c78399ddff207120cc5fe43",
                         "55197665cdc7250425b042b8",
                         "6105a55a8a437f50fb504a9c",
                         "55b26557e8837a284fded801",
                         "551157631cc8615862ab6d14",
                         "5c557b261147170a37cc584c",
                         "5c5d87a97f322a2d333898da",
                         "54f440c46f95404053dd46a9",
                         "5c5b104774cbc7053180bee2",
                         "5c5d3127f1a159315a062ad8",
                         "6105a55a8a437f50fb506076",
                         "6105a55a8a437f50fb506420",
                         "564be511276f28b90faefca8",
                         "605b9707796fa533c84f152c",
                         "659f6082ec10995ab646b4ed",
                         "605b970c796fa533c84f15ac",
                         "5c5b105e74cbc7053180d302",
                         "55b2651de8837a284fdea5af",
                         "55b25dd3e8837a284fde9b36",
                         "5cdcb7366337655c0b12ab97",
                         "65715297d3d303740cee63f4",
                         "6105a619eff26851012a6ca9",
                         "54f440c46f95404053dd4681",
                         "605b971c796fa533c84f1786",
                         "55b2681fe8837a284fe1eb50",
                         "605b971f796fa533c84f17ce",
                         "6105a619eff26851012a7aa3",
                         "605b972b796fa533c84f1904",
                         "6105a619eff26851012a8823",
                         "55b26542e8837a284fdebdf9",
                         "5c5b105274cbc7053180c966",
                         "5c5b05e46d242b74c211c400",
                         "605b973a796fa533c84f1a2a",
                         "605b973c796fa533c84f1a4a",
                         "54f440c46f95404053dd46fa",
                         "5c5d87fb7f322a2d3338a6d4",
                         "5c5b105074cbc7053180c6f6",
                         "5999f8265664a52694938ecc",
                         "605b9747796fa533c84f1b48",
                         "6105a619eff26851012aa775",
                         "54f440c46f95404053dd46fb",
                         "54f440c46f95404053dd46fc",
                         "6105a619eff26851012ab3a3",
                         "54f440c46f95404053dd4682",
                         "63910dd16b81704d208534e1",
                         "657152c2d3d303740cee64d8",
                         "6105a619eff26851012abe5a",
                         "605b9759796fa533c84f1cd0",
                         "5c5b05e46d242b74c211c404",
                         "6105a619eff26851012ac83b",
                         "605b9762796fa533c84f1d60",
                         "55b26576e8837a284fdee702",
                         "55226ed7c60f68882604cc47",
                         "6105a619eff26851012ad892",
                         "6105a619eff26851012ae92a",
                         "55b2658ee8837a284fdef43f",
                         "605b977b796fa533c84f1f48",
                         "55b2652be8837a284fdeb30d",
                         "6105a6bd8a437f50fb506f94",
                         "5512e09c84e7504047309424",
                         "6105a6bd8a437f50fb507ec3",
                         "5c557afa6178c50a3f95db9f",
                         "55b26658e8837a284fe0221e",
                         "6105a6bd8a437f50fb508b86",
                         "6105a6bd8a437f50fb5092ed",
                         "6105a6bd8a437f50fb5094b7",
                         "6105a6bd8a437f50fb5095cf",
                         "551fcd39cdc7250425b06cb0",
                         "659f9416e3604473daedd06a",
                         "605b97a7796fa533c84f229c",
                         "5c5d312ef1a159315a062dfa",
                         "6105a6bd8a437f50fb50a1fe",
                         "6105a6bd8a437f50fb50a4ae",
                         "60f08f2c3209994a43b77b01",
                         "6105a6bd8a437f50fb50a808",
                         "6105a6bd8a437f50fb50aaa1",
                         "6105a6bd8a437f50fb50ae98",
                         "605b97c8796fa533c84f2496",
                         "6105a6bd8a437f50fb50aead",
                         "605b97c8796fa533c84f249a",
                         "55b2654fe8837a284fdecbaa",
                         "5c5d879a7f322a2d333892ca",
                         "6105a6bd8a437f50fb50af77",
                         "6105a6bd8a437f50fb50af7c",
                         "5c4067c00f4dd935d6d1e375",
                         "6572c6277733690e0a058b3e",
                         "605b97cc796fa533c84f24cc",
                         "5c5bbda9d960ee4bdefc2865",
                         "605b97d3796fa533c84f2534",
                         "6105a6bd8a437f50fb50baf3",
                         "605b97d5796fa533c84f254a",
                         "5c5bbd95d960ee4bdefc15fd",
                         "60f08f2c3209994a43b788fb",
                         "6105a6bd8a437f50fb50be72",
                         "55b25dc3e8837a284fde8e0f",
                         "605b97df796fa533c84f25ec",
                         "6105a6bd8a437f50fb50ceff",
                         "6105a6bd8a437f50fb50d446",
                         "5c5b105474cbc7053180caae",
                         "5c5bbda9d960ee4bdefc2b11",
                         "5c5bbdaad960ee4bdefc3021",
                         "6105a6bd8a437f50fb50e0eb",
                         "5519710fcdc7250425b04298",
                         "605b9807796fa533c84f27e0",
                         "5c5d3128f1a159315a062b8c",
                         "6105a6bd8a437f50fb511309",
                         "60ef0c5366bb03171850bcde",
                         "60f08f2c3209994a43b7843f",
                         "5c5bbda0d960ee4bdefc19dd",
                         "60f08f2c3209994a43b79189",
                         "6105a6bd8a437f50fb5122de",
                         "605b982c796fa533c84f2992",
                         "605b9837796fa533c84f2a1a",
                         "55b265dce8837a284fdf749a",
                         "60f08f2c3209994a43b7918b",
                         "6105a7648a437f50fb513ab7",
                         "6105a7648a437f50fb513ce0",
                         "605b9848796fa533c84f2ac6",
                         "6105a7648a437f50fb514469",
                         "60f08f2c3209994a43b79199",
                         "6105a7648a437f50fb514ce1",
                         "55b265c9e8837a284fdf559a",
                         "5c407018c1d9bf444e5718e5",
                         "6105a7648a437f50fb515490",
                         "55b265c4e8837a284fdf4abd",
                         "6105a7648a437f50fb5154b2",
                         "5c5b106174cbc7053180d574",
                         "6105a7648a437f50fb515709",
                         "605b9889796fa533c84f2d54",
                         "55b26555e8837a284fded713",
                         "551d5773cdc7250425b069ab",
                         "605b9892796fa533c84f2daa",
                         "5c5bbdabd960ee4bdefc36d9",
                         "55b26576e8837a284fdee750",
                         "6105a7648a437f50fb5180f0",
                         "5fadc45866b5302542a49f97",
                         "6105a7648a437f50fb5189e6",
                         "55b26691e8837a284fe072c8",
                         "6105a7648a437f50fb518bda",
                         "605b98af796fa533c84f2eb6",
                         "6105a7648a437f50fb519e12",
                         "5c5d87917f322a2d3338908e",
                         "6105a7648a437f50fb51b4ba",
                         "6105a7648a437f50fb51bc20",
                         "605b98da796fa533c84f3058",
                         "6105a7648a437f50fb51c85a",
                         "6105a7648a437f50fb51d13d",
                         "5c5d88057f322a2d3338b0f2",
                         "6105a7648a437f50fb51e578",
                         "552027fbcdc7250425b06f1d",
                         "6105a830eff26851012b196e",
                         "571dd442e58dc4f66e9292ad",
                         "605b9945796fa533c84f3412",
                         "54f440c46f95404053dd468a",
                         "55b267d0e8837a284fe18820",
                         "605b995a796fa533c84f34b4",
                         "55b26607e8837a284fdfa483",
                         "55b25dc3e8837a284fde8eb3",
                         "6105a830eff26851012b3e02",
                         "6105a830eff26851012b48f0",
                         "55229eb7c60f68882604d0b4",
                         "659f7fc3e1c9e55ab7de20c4",
                         "605b99a5796fa533c84f36d0",
                         "6105a830eff26851012b6320",
                         "6105a830eff26851012b6950",
                         "6105a830eff26851012b6ab1",
                         "55b26707e8837a284fe0f57a",
                         "6105a830eff26851012b734d",
                         "6105a830eff26851012b8551",
                         "6105a830eff26851012b88ab",
                         "605b99f0796fa533c84f38ac",
                         "6105a830eff26851012b995f",
                         "6105a830eff26851012baab8",
                         "55b265d6e8837a284fdf6aed",
                         "5c5b05e36d242b74c211c302",
                         "6105a830eff26851012bb15b",
                         "5cdcb7586337655c0b12aff9",
                         "5c5d87867f322a2d33388d40",
                         "605b9a5c796fa533c84f3b7c",
                         "6105a831eff26851012beb7e",
                         "6571583d738ef37412ba654b",
                         "605b9a96796fa533c84f3d2a",
                         "605b9a96796fa533c84f3d2c",
                         "55b25dc3e8837a284fde8ddf",
                         "5c5bbda9d960ee4bdefc2893",
                         "5c5bbdaad960ee4bdefc30f5",
                         "605b9aef796fa533c84f3f5e",
                         "6105a95beff26851012c31c0",
                         "6105a95beff26851012c381a",
                         "62ed3f9e648b7514eb03a6d7",
                         "5c5bbd91d960ee4bdefc145b",
                         "55b265a5e8837a284fdf167e",
                         "5510bb2e1cc8615862ab6a7b",
                         "6105a95beff26851012c4358",
                         "605b9b2b796fa533c84f40a8",
                         "605b9b2e796fa533c84f40bc",
                         "6105a95beff26851012c4c0a"
                    ]
               }
          }
     },
     {
          "$unwind": "$GroupTags"
     },
     {
          "$group": {
               "_id": "$_id",
               "Title": {
                    "$first": "$Title"
               },
               "Prompt": {
                    "$first": "$Prompt"
               },
               "Locator": {
                    "$first": "$Locator"
               },
               "Location": {
                    "$first": "$Location"
               },
               "MediaType": {
                    "$first": "$MediaType"
               },
               "ContentType": {
                    "$first": "$ContentType"
               },
               "UploadedOn": {
                    "$first": "$UploadedOn"
               },
               "Content": {
                    "$first": "$Content"
               },
               "thumbnail": {
                    "$first": "$thumbnail"
               },
               "IsPrivate": {
                    "$first": "$IsPrivate"
               },
               "RandomSortId": {
                    "$first": "$RandomSortId"
               },
               "IsUnsplashImage": {
                    "$first": "$IsUnsplashImage"
               },
               "ViewsCount": {
                    "$first": "$ViewsCount"
               },
               "Ranks": {
                    "$push": {
                         "$switch": {
                              "branches": [
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5519710fcdc7250425b04298"
                                                  ]
                                             ]
                                        },
                                        "then": 242
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c557afa6178c50a3f95db9f"
                                                  ]
                                             ]
                                        },
                                        "then": 241
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c557b261147170a37cc584c"
                                                  ]
                                             ]
                                        },
                                        "then": 240
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26542e8837a284fdebdf9"
                                                  ]
                                             ]
                                        },
                                        "then": 239
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55117d441cc8615862ab6e0f"
                                                  ]
                                             ]
                                        },
                                        "then": 238
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a95beff26851012c4358"
                                                  ]
                                             ]
                                        },
                                        "then": 237
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b265dce8837a284fdf749a"
                                                  ]
                                             ]
                                        },
                                        "then": 236
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb515709"
                                                  ]
                                             ]
                                        },
                                        "then": 235
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb5180f0"
                                                  ]
                                             ]
                                        },
                                        "then": 234
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d88057f322a2d3338b0f2"
                                                  ]
                                             ]
                                        },
                                        "then": 233
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b77b01"
                                                  ]
                                             ]
                                        },
                                        "then": 232
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "551fcd39cdc7250425b06cb0"
                                                  ]
                                             ]
                                        },
                                        "then": 231
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a55a8a437f50fb506420"
                                                  ]
                                             ]
                                        },
                                        "then": 230
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c7771e904b5774eafc5ca20"
                                                  ]
                                             ]
                                        },
                                        "then": 229
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd46fa"
                                                  ]
                                             ]
                                        },
                                        "then": 228
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b267e1e8837a284fe19bf3"
                                                  ]
                                             ]
                                        },
                                        "then": 227
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26575e8837a284fdee6b6"
                                                  ]
                                             ]
                                        },
                                        "then": 226
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb5095cf"
                                                  ]
                                             ]
                                        },
                                        "then": 225
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "659a2f717c11011c03e23d9e"
                                                  ]
                                             ]
                                        },
                                        "then": 224
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "63910dd16b81704d208534e1"
                                                  ]
                                             ]
                                        },
                                        "then": 223
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb5092ed"
                                                  ]
                                             ]
                                        },
                                        "then": 222
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b734d"
                                                  ]
                                             ]
                                        },
                                        "then": 221
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97df796fa533c84f25ec"
                                                  ]
                                             ]
                                        },
                                        "then": 220
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5512e09c84e7504047309424"
                                                  ]
                                             ]
                                        },
                                        "then": 219
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c407018c1d9bf444e5718c5"
                                                  ]
                                             ]
                                        },
                                        "then": 218
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26607e8837a284fdfa483"
                                                  ]
                                             ]
                                        },
                                        "then": 217
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012a7aa3"
                                                  ]
                                             ]
                                        },
                                        "then": 216
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6572c6277733690e0a058b3e"
                                                  ]
                                             ]
                                        },
                                        "then": 215
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b7843f"
                                                  ]
                                             ]
                                        },
                                        "then": 214
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60ef0c5366bb03171850bcde"
                                                  ]
                                             ]
                                        },
                                        "then": 213
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "65715297d3d303740cee63f4"
                                                  ]
                                             ]
                                        },
                                        "then": 212
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9aef796fa533c84f3f5e"
                                                  ]
                                             ]
                                        },
                                        "then": 211
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9848796fa533c84f2ac6"
                                                  ]
                                             ]
                                        },
                                        "then": 210
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129d9ae"
                                                  ]
                                             ]
                                        },
                                        "then": 209
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d3127f1a159315a062ad8"
                                                  ]
                                             ]
                                        },
                                        "then": 208
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b96c5796fa533c84f0edc"
                                                  ]
                                             ]
                                        },
                                        "then": 207
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b970c796fa533c84f15ac"
                                                  ]

                       ]
                                        },
                                        "then": 206
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "551182511cc8615862ab6eb8"
                                                  ]
                                             ]
                                        },
                                        "then": 205
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "657152c2d3d303740cee64d8"
                                                  ]
                                             ]
                                        },
                                        "then": 204
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbdaad960ee4bdefc3021"
                                                  ]
                                             ]
                                        },
                                        "then": 203
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b99a5796fa533c84f36d0"
                                                  ]
                                             ]
                                        },
                                        "then": 202
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9837796fa533c84f2a1a"
                                                  ]
                                             ]
                                        },
                                        "then": 201
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9889796fa533c84f2d54"
                                                  ]
                                             ]
                                        },
                                        "then": 200
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97c8796fa533c84f249a"
                                                  ]
                                             ]
                                        },
                                        "then": 199
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b95b5eb2c64338afa1d4f"
                                                  ]
                                             ]
                                        },
                                        "then": 198
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b973a796fa533c84f1a2a"
                                                  ]
                                             ]
                                        },
                                        "then": 197
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "551157631cc8615862ab6d14"
                                                  ]
                                             ]
                                        },
                                        "then": 196
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b977b796fa533c84f1f48"
                                                  ]
                                             ]
                                        },
                                        "then": 195
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6571583d738ef37412ba654b"
                                                  ]
                                             ]
                                        },
                                        "then": 194
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9892796fa533c84f2daa"
                                                  ]
                                             ]
                                        },
                                        "then": 193
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b265c4e8837a284fdf4abd"
                                                  ]
                                             ]
                                        },
                                        "then": 192
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b98af796fa533c84f2eb6"
                                                  ]
                                             ]
                                        },
                                        "then": 191
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d87917f322a2d3338908e"
                                                  ]
                                             ]
                                        },
                                        "then": 190
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b25dd3e8837a284fde9b36"
                                                  ]
                                             ]
                                        },
                                        "then": 189
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b95b5eb2c64338afa1d4d"
                                                  ]
                                             ]
                                        },
                                        "then": 188
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b05e46d242b74c211c400"
                                                  ]
                                             ]
                                        },
                                        "then": 187
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b99f0796fa533c84f38ac"
                                                  ]
                                             ]
                                        },
                                        "then": 186
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9a5c796fa533c84f3b7c"
                                                  ]
                                             ]
                                        },
                                        "then": 185
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d87fb7f322a2d3338a6d4"
                                                  ]
                                             ]
                                        },
                                        "then": 184
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97d3796fa533c84f2534"
                                                  ]
                                             ]
                                        },
                                        "then": 183
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b8551"
                                                  ]
                                             ]
                                        },
                                        "then": 182
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd46fc"
                                                  ]
                                             ]
                                        },
                                        "then": 181
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d87867f322a2d33388d40"
                                                  ]
                                             ]
                                        },
                                        "then": 180
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97cc796fa533c84f24cc"
                                                  ]
                                             ]
                                        },
                                        "then": 179
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b971c796fa533c84f1786"
                                                  ]
                                             ]
                                        },
                                        "then": 178
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5999f8265664a52694938ecc"
                                                  ]
                                             ]
                                        },
                                        "then": 177
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26658e8837a284fe0221e"
                                                  ]
                                             ]
                                        },
                                        "then": 176
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012a6ca9"
                                                  ]
                                             ]
                                        },
                                        "then": 175
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b25dc3e8837a284fde8eb3"
                                                  ]
                                             ]
                                        },
                                        "then": 174
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012bb15b"
                                                  ]
                                             ]
                                        },
                                        "then": 173
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b25dc3e8837a284fde8e0f"
                                                  ]
                                             ]
                                        },
                                        "then": 172
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b786f9"
                                                  ]
                                             ]
                                        },
                                        "then": 171
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012ad892"
                                                  ]
                                             ]
                                        },
                                        "then": 170
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbdabd960ee4bdefc36d9"
                                                  ]
                                             ]
                                        },
                                        "then": 169
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb518bda"
                                                  ]
                                             ]
                                        },
                                        "then": 168
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50af7c"
                                                  ]
                                             ]
                                        },
                                        "then": 167
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c4067c00f4dd935d6d1e375"
                                                  ]
                                             ]
                                        },
                                        "then": 166
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b25dc3e8837a284fde8ec3"
                                                  ]
                                             ]
                                        },
                                        "then": 165
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "65714c932dab355d455b51df"
                                                  ]
                                             ]
                                        },
                                        "then": 164
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "552027fbcdc7250425b06f1d"
                                                  ]
                                             ]
                                        },
                                        "then": 163
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b95b5eb2c64338afa1d51"
                                                  ]
                                             ]
                                        },
                                        "then": 162
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50aaa1"
                                                  ]
                                             ]
                                        },
                                        "then": 161
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbda0d960ee4bdefc19dd"
                                                  ]
                                             ]
                                        },
                                        "then": 160
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d88057f322a2d3338b0f8"
                                                  ]
                                             ]
                                        },
                                        "then": 159
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b972b796fa533c84f1904"
                                                  ]
                                             ]
                                        },
                                        "then": 158
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9a96796fa533c84f3d2a"
                                                  ]
                                             ]
                                        },
                                        "then": 157
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d312ef1a159315a062dfa"
                                                  ]
                                             ]
                                        },
                                        "then": 156
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbd95d960ee4bdefc15fd"
                                                  ]
                                             ]
                                        },
                                        "then": 155
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9762796fa533c84f1d60"
                                                  ]
                                             ]
                                        },
                                        "then": 154
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b88ab"
                                                  ]
                                             ]
                                        },
                                        "then": 153
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012ac83b"
                                                  ]
                                             ]
                                        },
                                        "then": 152
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b2658ee8837a284fdef43f"
                                                  ]
                                             ]
                                        },
                                        "then": 151
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b2652be8837a284fdeb30d"
                                                  ]
                                             ]
                                        },
                                        "then": 150
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b95adeb2c64338afa1cb5"
                                                  ]
                                             ]
                                        },
                                        "then": 149
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9b2e796fa533c84f40bc"
                                                  ]
                                             ]
                                        },
                                        "then": 148
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b05e46d242b74c211c404"
                                                  ]
                                             ]
                                        },
                                        "then": 147
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b98da796fa533c84f3058"
                                                  ]
                                             ]
                                        },
                                        "then": 146
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b106174cbc7053180d574"
                                                  ]
                                             ]
                                        },
                                        "then": 145
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55229eb7c60f68882604d0b4"
                                                  ]
                                             ]
                                        },
                                        "then": 144
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [

                     "55b2681fe8837a284fe1eb50"
                                                  ]
                                             ]
                                        },
                                        "then": 143
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b105274cbc7053180c966"
                                                  ]
                                             ]
                                        },
                                        "then": 142
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b96db796fa533c84f10da"
                                                  ]
                                             ]
                                        },
                                        "then": 141
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26691e8837a284fe072c8"
                                                  ]
                                             ]
                                        },
                                        "then": 140
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbd91d960ee4bdefc145b"
                                                  ]
                                             ]
                                        },
                                        "then": 139
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97a7796fa533c84f229c"
                                                  ]
                                             ]
                                        },
                                        "then": 138
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b05e36d242b74c211c302"
                                                  ]
                                             ]
                                        },
                                        "then": 137
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9747796fa533c84f1b48"
                                                  ]
                                             ]
                                        },
                                        "then": 136
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbdaad960ee4bdefc30f5"
                                                  ]
                                             ]
                                        },
                                        "then": 135
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbda9d960ee4bdefc2893"
                                                  ]
                                             ]
                                        },
                                        "then": 134
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb51d13d"
                                                  ]
                                             ]
                                        },
                                        "then": 133
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012baab8"
                                                  ]
                                             ]
                                        },
                                        "then": 132
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d3128f1a159315a062b8c"
                                                  ]
                                             ]
                                        },
                                        "then": 131
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb513ab7"
                                                  ]
                                             ]
                                        },
                                        "then": 130
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129d2a2"
                                                  ]
                                             ]
                                        },
                                        "then": 129
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd468a"
                                                  ]
                                             ]
                                        },
                                        "then": 128
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b2651de8837a284fdea5af"
                                                  ]
                                             ]
                                        },
                                        "then": 127
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb5189e6"
                                                  ]
                                             ]
                                        },
                                        "then": 126
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff26851012997b5"
                                                  ]
                                             ]
                                        },
                                        "then": 125
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "65714cf52dab355d455b53cf"
                                                  ]
                                             ]
                                        },
                                        "then": 124
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b267d0e8837a284fe18820"
                                                  ]
                                             ]
                                        },
                                        "then": 123
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5fadc46466b5302542a4a07b"
                                                  ]
                                             ]
                                        },
                                        "then": 122
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129df0b"
                                                  ]
                                             ]
                                        },
                                        "then": 121
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b971f796fa533c84f17ce"
                                                  ]
                                             ]
                                        },
                                        "then": 120
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129989d"
                                                  ]
                                             ]
                                        },
                                        "then": 119
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50a4ae"
                                                  ]
                                             ]
                                        },
                                        "then": 118
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b6ab1"
                                                  ]
                                             ]
                                        },
                                        "then": 117
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a95beff26851012c31c0"
                                                  ]
                                             ]
                                        },
                                        "then": 116
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb519e12"
                                                  ]
                                             ]
                                        },
                                        "then": 115
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb5094b7"
                                                  ]
                                             ]
                                        },
                                        "then": 114
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b265c9e8837a284fdf559a"
                                                  ]
                                             ]
                                        },
                                        "then": 113
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a95beff26851012c381a"
                                                  ]
                                             ]
                                        },
                                        "then": 112
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b973c796fa533c84f1a4a"
                                                  ]
                                             ]
                                        },
                                        "then": 111
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26555e8837a284fded713"
                                                  ]
                                             ]
                                        },
                                        "then": 110
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5cdcb7366337655c0b12ab97"
                                                  ]
                                             ]
                                        },
                                        "then": 109
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb513ce0"
                                                  ]
                                             ]
                                        },
                                        "then": 108
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b995a796fa533c84f34b4"
                                                  ]
                                             ]
                                        },
                                        "then": 107
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b982c796fa533c84f2992"
                                                  ]
                                             ]
                                        },
                                        "then": 106
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50a1fe"
                                                  ]
                                             ]
                                        },
                                        "then": 105
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012abe5a"
                                                  ]
                                             ]
                                        },
                                        "then": 104
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b48f0"
                                                  ]
                                             ]
                                        },
                                        "then": 103
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b95aceb2c64338afa1c9f"
                                                  ]
                                             ]
                                        },
                                        "then": 102
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9945796fa533c84f3412"
                                                  ]
                                             ]
                                        },
                                        "then": 101
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97c8796fa533c84f2496"
                                                  ]
                                             ]
                                        },
                                        "then": 100
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b265d6e8837a284fdf6aed"
                                                  ]
                                             ]
                                        },
                                        "then": 99
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012aa775"
                                                  ]
                                             ]
                                        },
                                        "then": 98
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "659f7fc3e1c9e55ab7de20c4"
                                                  ]
                                             ]
                                        },
                                        "then": 97
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26576e8837a284fdee750"
                                                  ]
                                             ]
                                        },
                                        "then": 96
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb514469"
                                                  ]
                                             ]
                                        },
                                        "then": 95
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb514ce1"
                                                  ]
                                             ]
                                        },
                                        "then": 94
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129cb64"
                                                  ]
                                             ]
                                        },
                                        "then": 93
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb51c85a"
                                                  ]
                                             ]
                                        },
                                        "then": 92
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b995f"
                                                  ]
                                             ]
                                        },
                                        "then": 91
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012ab3a3"
                                                  ]
                                             ]
                                        },
                                        "then": 90
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b6320"
                                                  ]
                                             ]
                                        },
                                        "then": 89
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129f1ab"
                                                  ]
                                             ]
                                        },
                                        "then": 88
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129eb34"
                                                  ]
                                             ]
                                        },
                                        "then": 87
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb506f94"
                                                  ]
                                             ]
                                        },
                                        "then": 86
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012ae92a"
                                                  ]
                                             ]
                                        },
                                        "then": 85
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a831eff26851012beb7e"
                                                  ]
                                             ]
                                        },
                                        "then": 84
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff26851012a2d08"
                                                  ]
                                             ]
                                        },
                                        "then": 83
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "659f9416e3604473daedd06a"
                                                  ]
                                             ]
                                        },
                                        "then": 82
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129dba2"
                                                  ]
                                             ]
                                        },
                                        "then": 81
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb51e578"
                                                  ]
                                             ]
                                        },
                                        "then": 80
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "659f6082ec10995ab646b4ed"
                                                  ]
                                             ]
                                        },
                                        "then": 79
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb5122de"
                                                  ]
                                             ]
                                        },
                                        "then": 78
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb5154b2"
                                                  ]
                                             ]
                                        },
                                        "then": 77
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbdabd960ee4bdefc3b53"
                                                  ]
                                             ]
                                        },
                                        "then": 76
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff2685101298c87"
                                                  ]
                                             ]
                                        },
                                        "then": 75
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9707796fa533c84f152c"
                                                  ]
                                             ]
                                        },
                                        "then": 74
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50e0eb"
                                                  ]
                                             ]
                                        },
                                        "then": 73
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b196e"
                                                  ]
                                             ]
                                        },
                                        "then": 72
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b79199"
                                                  ]
                                             ]
                                        },
                                        "then": 71
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b79189"
                                                  ]
                                             ]
                                        },
                                        "then": 70
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b7918b"
                                                  ]
                                             ]
                                        },
                                        "then": 69
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a55a8a437f50fb504a9c"
                                                  ]
                                             ]
                                        },
                                        "then": 68
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb511309"
                                                  ]
                                             ]
                                        },
                                        "then": 67
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26576e8837a284fdee702"
                                                  ]
                                             ]
                                        },
                                        "then": 66
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "571dd442e58dc4f66e9292ad"
                                                  ]
                                             ]
                                        },
                                        "then": 65
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb507ec3"
                                                  ]
                                             ]
                                        },
                                        "then": 64
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff2685101299c73"
                                                  ]
                                             ]
                                        },
                                        "then": 63
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd46a9"
                                                  ]
                                             ]
                                        },
                                        "then": 62
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55197665cdc7250425b042b8"
                                                  ]
                                             ]
                                        },
                                        "then": 61
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff26851012a3c63"
                                                  ]
                                             ]
                                        },
                                        "then": 60
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "65714d032dab355d455b540c"
                                                  ]
                                             ]
                                        },
                                        "then": 59
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d87a37f322a2d333895f6"
                                                  ]
                                             ]
                                        },
                                        "then": 58
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129c6de"
                                                  ]
                                             ]
                                        },
                                        "then": 57
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5be03a6afa72b01657e5ad01"
                                                  ]
                                             ]
                                        },
                                        "then": 56
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b786c1"
                                                  ]
                                             ]
                                        },
                                        "then": 55
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff268510129acf7"
                                                  ]
                                             ]
                                        },
                                        "then": 54
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd467d"
                                                  ]
                                             ]
                                        },
                                        "then": 53
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a371eff2685101297635"
                                                  ]
                                             ]
                                        },
                                        "then": 52
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26557e8837a284fded801"
                                                  ]
                                             ]
                                        },
                                        "then": 51
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d87a97f322a2d333898da"
                                                  ]
                                             ]
                                        },
                                        "then": 50
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b104774cbc7053180bee2"
                                                  ]
                                             ]
                                        },
                                        "then": 49
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a55a8a437f50fb506076"
                                                  ]
                                             ]
                                        },
                                        "then": 48
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd4681"
                                                  ]
                                             ]
                                        },
                                        "then": 47
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012a8823"
                                                  ]
                                             ]
                                        },
                                        "then": 46
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b105074cbc7053180c6f6"
                                                  ]
                                             ]
                                        },
                                        "then": 45
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd46fb"
                                                  ]
                                             ]
                                        },
                                        "then": 44
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "54f440c46f95404053dd4682"
                                                  ]
                                             ]
                                        },
                                        "then": 43
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9759796fa533c84f1cd0"
                                                  ]
                                             ]
                                        },
                                        "then": 42
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55226ed7c60f68882604cc47"
                                                  ]
                                             ]
                                        },
                                        "then": 41
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb508b86"
                                                  ]
                                             ]
                                        },
                                        "then": 40
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50a808"
                                                  ]
                                             ]
                                        },
                                        "then": 39
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50ae98"
                                                  ]
                                             ]
                                        },
                                        "then": 38
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50aead"
                                                  ]
                                             ]
                                        },
                                        "then": 37
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5d879a7f322a2d333892ca"
                                                  ]
                                             ]
                                        },
                                        "then": 36
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50af77"
                                                  ]
                                             ]
                                        },
                                        "then": 35
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbda9d960ee4bdefc2865"
                                                  ]
                                             ]
                                        },
                                        "then": 34
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50baf3"
                                                  ]
                                             ]
                                        },
                                        "then": 33
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b97d5796fa533c84f254a"
                                                  ]
                                             ]
                                        },
                                        "then": 32
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b788fb"
                                                  ]
                                             ]
                                        },
                                        "then": 31
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50ceff"
                                                  ]
                                             ]
                                        },
                                        "then": 30
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b105474cbc7053180caae"
                                                  ]
                                             ]
                                        },
                                        "then": 29
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9807796fa533c84f27e0"
                                                  ]
                                             ]
                                        },
                                        "then": 28
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb515490"
                                                  ]
                                             ]
                                        },
                                        "then": 27
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "551d5773cdc7250425b069ab"
                                                  ]
                                             ]
                                        },
                                        "then": 26
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5fadc45866b5302542a49f97"
                                                  ]
                                             ]
                                        },
                                        "then": 25
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb51b4ba"
                                                  ]
                                             ]
                                        },
                                        "then": 24
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a7648a437f50fb51bc20"
                                                  ]
                                             ]
                                        },
                                        "then": 23
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b3e02"
                                                  ]
                                             ]
                                        },
                                        "then": 22
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a830eff26851012b6950"
                                                  ]
                                             ]
                                        },
                                        "then": 21
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5cdcb7586337655c0b12aff9"
                                                  ]
                                             ]
                                        },
                                        "then": 20
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9a96796fa533c84f3d2c"
                                                  ]
                                             ]
                                        },
                                        "then": 19
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b265a5e8837a284fdf167e"
                                                  ]
                                             ]
                                        },
                                        "then": 18
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5510bb2e1cc8615862ab6a7b"
                                                  ]
                                             ]
                                        },
                                        "then": 17
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "605b9b2b796fa533c84f40a8"
                                                  ]
                                             ]
                                        },
                                        "then": 16
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a95beff26851012c4c0a"
                                                  ]
                                             ]
                                        },
                                        "then": 15
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbda9d960ee4bdefc2b11"
                                                  ]
                                             ]
                                        },
                                        "then": 14
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c407018c1d9bf444e5718e5"
                                                  ]
                                             ]
                                        },
                                        "then": 13
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50be72"
                                                  ]
                                             ]
                                        },
                                        "then": 12
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c78399ddff207120cc5fe43"
                                                  ]
                                             ]
                                        },
                                        "then": 11
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "60f08f2c3209994a43b77baf"
                                                  ]
                                             ]
                                        },
                                        "then": 10
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "62ed3f9e648b7514eb03a6d7"
                                                  ]
                                             ]
                                        },
                                        "then": 9
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a6bd8a437f50fb50d446"
                                                  ]
                                             ]
                                        },
                                        "then": 8
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5bbda9d960ee4bdefc21f7"
                                                  ]
                                             ]
                                        },
                                        "then": 7
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b25dc3e8837a284fde8ddf"
                                                  ]
                                             ]
                                        },
                                        "then": 6
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "564be511276f28b90faefca8"
                                                  ]
                                             ]
                                        },
                                        "then": 5
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b2654fe8837a284fdecbaa"
                                                  ]
                                             ]
                                        },
                                        "then": 4
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b26707e8837a284fe0f57a"
                                                  ]
                                             ]
                                        },
                                        "then": 3
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "5c5b105e74cbc7053180d302"
                                                  ]
                                             ]
                                        },
                                        "then": 2
                                   },
                                   {
                                        "case": {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "55b2654ee8837a284fdeca5e"
                                                  ]
                                             ]
                                        },
                                        "then": 1
                                   }
                              ],
                              "default": 0
                         }
                    }
               },
               "Lightness": {
                    "$first": "$Lightness"
               },
               "DominantColors": {
                    "$first": "$DominantColors"
               },
               "MetaData": {
                    "$first": "$MetaData"
               },
               "SecondaryKeywords": {
                    "$push": {
                         "$cond": [
                              {
                                   "$and": [
                                        {
                                             "$in": [
                                                  "$GroupTags.GroupTagID",
                                                  [
                                                       "6105a619eff26851012a69a8",
                                                       "6105a619eff26851012ae31d",
                                                       "551155cd1cc8615862ab6cf8",
                                                       "5519710fcdc7250425b04298",
                                                       "60f8204d6f8488795b86cca9",
                                                       "551abc81cdc7250425b05812"
                                                  ]
                                             ]
                                        }
                                   ]
                              },
                              "$GroupTags.GroupTagID",
                              "$$REMOVE"
                         ]
                    }
               }
          }
     },
     {
          "$project": {
               "_id": "$_id",
               "value": {
                    "_id": "$_id",
                    "Title": "$Title",
                    "Prompt": "$Prompt",
                    "Locator": "$Locator",
                    "Location": "$Location",
                    "MediaType": "$MediaType",
                    "ContentType": "$ContentType",
                    "UploadedOn": "$UploadedOn",
                    "Content": "$Content",
                    "thumbnail": "$thumbnail",
                    "IsPrivate": "$IsPrivate",
                    "RandomSortId": "$RandomSortId",
                    "IsUnsplashImage": "$IsUnsplashImage",
                    "ViewsCount": "$ViewsCount",
                    "Ranks": {
                         "$max": "$Ranks"
                    },
                    "Lightness": "$Lightness",
                    "DominantColors": "$DominantColors",
                    "AllMetaData": "$MetaData",
                    "MetaData": "$MetaData",
                    "SecondaryKeywords": {
                         "$ifNull": [
                              "$SecondaryKeywords",
                              []
                         ]
                    },
                    "SecondaryKeywordsCount": {
                         "$size": {
                              "$ifNull": [
                                   "$SecondaryKeywords",
                                   []
                              ]
                         }
                    }
               }
          }
     },
     {
          "$sort": {
               "value.MediaSelectionCriteriaCount": -1,
               "value.SecondaryKeywordsCount": -1,
               "value.Ranks": -1,
               "value.RandomSortId": -1,
               "value.UploadedOn": -1
          }
     }
]
