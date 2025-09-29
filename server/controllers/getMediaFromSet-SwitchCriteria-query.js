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
                         "6105a371eff2685101297a55",
                         "605b959d8e87de3390e15fbc",
                         "5519710fcdc7250425b04297",
                         "605b959deb2c64338afa1b7d",
                         "605b959d8e87de3390e15fbe",
                         "605b95a38e87de3390e1600a",
                         "6105a371eff2685101298794",
                         "6105a371eff26851012987bc",
                         "605b95a4eb2c64338afa1bf5",
                         "605b95a48e87de3390e16026",
                         "6105a371eff2685101298fe9",
                         "6105a371eff2685101299471",
                         "6105a371eff26851012999b4",
                         "6105a371eff26851012999be",
                         "6105a371eff26851012999ef",
                         "6105a371eff2685101299c13",
                         "6105a371eff268510129c5fd",
                         "564be49c276f28b90faefb89",
                         "605b96ba796fa533c84f0dc6",
                         "6105a371eff268510129dc44",
                         "5c5b104f74cbc7053180c67c",
                         "605b96bc796fa533c84f0df6",
                         "6105a371eff268510129de88",
                         "6105a371eff268510129ef7e",
                         "5c5d3129f1a159315a062bf2",
                         "6105a371eff268510129f24a",
                         "6105a371eff268510129f254",
                         "657153ac738ef37412ba5680",
                         "5c407016c1d9bf444e571825",
                         "582dfdcbc2a8e4ef4c2f8cf0",
                         "5522845dc60f68882604cd79",
                         "6105a371eff26851012a292f",
                         "6105a371eff26851012a39a7",
                         "55118a191cc8615862ab6fc2",
                         "659dfb3756be2f4668ea72da",
                         "6105a371eff26851012a3b1f",
                         "55b2671de8837a284fe11425",
                         "605b96ea796fa533c84f1264",
                         "5511831d1cc8615862ab6ee3",
                         "5511589d1cc8615862ab6d48",
                         "5dd70bfb26603627be1575bb",
                         "605b96f1796fa533c84f1324",
                         "6105a55a8a437f50fb503a4c",
                         "5c5b105874cbc7053180ce0e",
                         "5c5b105c74cbc7053180d0f2",
                         "6105a55a8a437f50fb503fcf",
                         "605b96f4796fa533c84f1376",
                         "6105a55a8a437f50fb50491b",
                         "6105a55a8a437f50fb504b88",
                         "6105a55a8a437f50fb504e87",
                         "605b96fd796fa533c84f1444",
                         "55219e0bcdc7250425b07485",
                         "605b9707796fa533c84f1538",
                         "605b970e796fa533c84f1600",
                         "55b266c5e8837a284fe095d8",
                         "55b265a5e8837a284fdf1670",
                         "6105a619eff26851012a62d3",
                         "605b971b796fa533c84f1768",
                         "605b9732796fa533c84f1984",
                         "551186831cc8615862ab6f4d",
                         "55b265b2e8837a284fdf2c4e",
                         "6105a619eff26851012a8fe3",
                         "5c5b105c74cbc7053180d17a",
                         "55b266c6e8837a284fe09662",
                         "659f940ee3604473daedd035",
                         "5c5bbd9ed960ee4bdefc1963",
                         "552fd37422482d6b63361f3c",
                         "605b973f796fa533c84f1a98",
                         "605b973f796fa533c84f1a9a",
                         "6105a619eff26851012a9cb7",
                         "6105a619eff26851012a9cc2",
                         "6105a619eff26851012a9e0b",
                         "55b2651de8837a284fdea5c3",
                         "6105a619eff26851012ab3d3",
                         "6105a619eff26851012ab460",
                         "5c5d878c7f322a2d33388e98",
                         "605b9762796fa533c84f1d66",
                         "6105a619eff26851012ace2d",
                         "5c5bbda9d960ee4bdefc2a77",
                         "55226ed7c60f68882604cc47",
                         "5c5d86068462d826f2df4a85",
                         "605b9778796fa533c84f1f02",
                         "60f08f2c3209994a43b787d1",
                         "605b9781796fa533c84f1fb6",
                         "5c5bbdabd960ee4bdefc36d1",
                         "551189441cc8615862ab6f9b",
                         "6105a6bd8a437f50fb507565",
                         "6105a6bd8a437f50fb5089dc",
                         "551188c31cc8615862ab6f85",
                         "6105a6bd8a437f50fb509c06",
                         "5c5d87f27f322a2d3338a52c",
                         "605b97af796fa533c84f2318",
                         "55b266d2e8837a284fe0a933",
                         "6105a6bd8a437f50fb509dd0",
                         "6105a6bd8a437f50fb509dda",
                         "6105a6bd8a437f50fb509de4",
                         "605b97af796fa533c84f231a",
                         "605b97b8796fa533c84f23a8",
                         "6105a6bd8a437f50fb50a1d9",
                         "6105a6bd8a437f50fb50a1e0",
                         "6105a6bd8a437f50fb50a204",
                         "5522735bc60f68882604ccce",
                         "605b97f0796fa533c84f26c4",
                         "605b9800796fa533c84f279a",
                         "5c5bbda9d960ee4bdefc28f5",
                         "5c5b105374cbc7053180c9fa",
                         "6105a6bd8a437f50fb5111de",
                         "605b9822796fa533c84f2928",
                         "5c4067be0f4dd935d6d1e295",
                         "6105a7648a437f50fb5127be",
                         "6105a7648a437f50fb5127ee",
                         "605b9833796fa533c84f29ea",
                         "605b9849796fa533c84f2ace",
                         "6105a7648a437f50fb51593c",
                         "6105a7648a437f50fb515f46",
                         "6105a7648a437f50fb515f74",
                         "605b987c796fa533c84f2cd2",
                         "605b987f796fa533c84f2cee",
                         "605b9885796fa533c84f2d34",
                         "551fcd39cdc7250425b06caf",
                         "551d6176cdc7250425b069f1",
                         "605b98bf796fa533c84f2f4c",
                         "60f08f2c3209994a43b78b23",
                         "6105a7648a437f50fb51bb02",
                         "5c557b4b58df260a494415e6",
                         "5c5b105174cbc7053180c880",
                         "54f440c46f95404053dd4689",
                         "659f2a6f56be2f4668ea7e15",
                         "605b98dc796fa533c84f3062",
                         "605b98dd796fa533c84f3076",
                         "5c5b105c74cbc7053180d194",
                         "6105a7648a437f50fb51c471",
                         "55b265e2e8837a284fdf7e64",
                         "55b265e2e8837a284fdf7e72",
                         "605b9903796fa533c84f31dc",
                         "55b25db9e8837a284fde7a07",
                         "55b265a5e8837a284fdf1672",
                         "6105a7648a437f50fb51e9f6",
                         "605b991e796fa533c84f32c6",
                         "6105a7648a437f50fb51ea14",
                         "6105a7648a437f50fb51eb8e",
                         "6105a830eff26851012b10ec",
                         "575fd6168a6fb35336a29f43",
                         "605b9923796fa533c84f32f4",
                         "605b9924796fa533c84f32f6",
                         "6105a830eff26851012b130d",
                         "6105a830eff26851012b131a",
                         "6105a830eff26851012b1341",
                         "5c5d87a97f322a2d33389904",
                         "5c5bbdaad960ee4bdefc35bb",
                         "605b9925796fa533c84f32fa",
                         "6105a830eff26851012b13fc",
                         "6105a830eff26851012b14fc",
                         "6105a830eff26851012b155d",
                         "6105a830eff26851012b1749",
                         "6105a830eff26851012b1825",
                         "5c5b104b74cbc7053180c28c",
                         "5c5d88077f322a2d3338c0a6",
                         "6105a830eff26851012b1aab",
                         "605b9936796fa533c84f3388",
                         "551fc63fcdc7250425b06c3c",
                         "55b267fbe8837a284fe1be86",
                         "6105a830eff26851012b1d48",
                         "5c5d88057f322a2d3338aa08",
                         "6105a830eff26851012b1da5",
                         "6105a830eff26851012b2591",
                         "605b9952796fa533c84f3470",
                         "6105a830eff26851012b2656",
                         "6105a830eff26851012b288d",
                         "6105a830eff26851012b2b07",
                         "571de6efbe020b0f52af792f",
                         "6105a830eff26851012b2b25",
                         "5c5d3126f1a159315a062ab0",
                         "605b9969796fa533c84f3534",
                         "6105a830eff26851012b4229",
                         "6105a830eff26851012b56ae",
                         "5c5d88057f322a2d3338b284",
                         "6105a830eff26851012b67e0",
                         "605b99bc796fa533c84f375e",
                         "6105a830eff26851012b9a19",
                         "6105a830eff26851012b9a39",
                         "605b9a03796fa533c84f3926",
                         "605b9a04796fa533c84f392c",
                         "5c5b105c74cbc7053180d158",
                         "6105a830eff26851012babe2",
                         "605b9a15796fa533c84f399c",
                         "605b9a15796fa533c84f399e",
                         "6105a830eff26851012bac0e",
                         "5c5bbda8d960ee4bdefc1bbd",
                         "605b9a21796fa533c84f39e2",
                         "55153fa9571a1674358bce1e",
                         "605b9a34796fa533c84f3a7a",
                         "5c5b105974cbc7053180cee0",
                         "5c557afa6178c50a3f95dbc9",
                         "605b9a34796fa533c84f3a7c",
                         "6105a830eff26851012bc051",
                         "6105a830eff26851012bc2b1",
                         "5c5d3117f1a159315a0623c6",
                         "605b9a56796fa533c84f3b54",
                         "5c5bbdabd960ee4bdefc39d9",
                         "6105a831eff26851012bf8a0",
                         "5c5b105674cbc7053180cd20",
                         "6105a95beff26851012c04cc",
                         "605b9abd796fa533c84f3e3e",
                         "605b9abd796fa533c84f3e40",
                         "6105a95beff26851012c1542",
                         "5c4067bf0f4dd935d6d1e2ed",
                         "659f6f8ee1c9e55ab7de1950",
                         "6105a95beff26851012c161a",
                         "6105a95beff26851012c163b",
                         "6105a95beff26851012c1655",
                         "5c5d86068462d826f2df4a2f",
                         "605b9ae1796fa533c84f3f1a",
                         "5c5d310ff1a159315a0620cc",
                         "6105a95beff26851012c4d54"
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
                                                       "55b265a5e8837a284fdf1672"
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
                                                       "605b96bc796fa533c84f0df6"
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
                                                       "6105a830eff26851012b56ae"
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
                                                       "605b95a38e87de3390e1600a"
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
                                                       "6105a371eff26851012999b4"
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
                                                       "55b265b2e8837a284fdf2c4e"
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
                                                       "605b9925796fa533c84f32fa"
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
                                                       "6105a7648a437f50fb515f46"
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
                                                       "6105a7648a437f50fb5127be"
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
                                                       "605b97b8796fa533c84f23a8"
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
                                                       "575fd6168a6fb35336a29f43"
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
                                                       "6105a6bd8a437f50fb50a1d9"
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
                                                       "5c5d3129f1a159315a062bf2"
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
                                                       "5522845dc60f68882604cd79"
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
                                                       "55b265e2e8837a284fdf7e72"
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
                                                       "6105a6bd8a437f50fb50a1e0"
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
                                                       "5c5bbdabd960ee4bdefc36d1"
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
                                                       "582dfdcbc2a8e4ef4c2f8cf0"
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
                                                       "605b9781796fa533c84f1fb6"
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
                                                       "5c5d310ff1a159315a0620cc"
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
                                                       "605b9ae1796fa533c84f3f1a"
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
                                                       "5c5bbda9d960ee4bdefc28f5"
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
                                                       "5c5b105174cbc7053180c880"
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
                                                       "605b99bc796fa533c84f375e"
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
                                                       "605b9833796fa533c84f29ea"
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
                                                       "605b987c796fa533c84f2cd2"
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
                                                       "551188c31cc8615862ab6f85"
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
                                                       "5c5bbd9ed960ee4bdefc1963"
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
                                                       "55b25db9e8837a284fde7a07"
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
                                                       "605b9a21796fa533c84f39e2"
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
                                                       "605b97f0796fa533c84f26c4"
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
                                                       "605b96ba796fa533c84f0dc6"
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
                                                       "659f940ee3604473daedd035"
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
                                                       "605b9732796fa533c84f1984"
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
                                                       "55b266c5e8837a284fe095d8"
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
                                                       "55219e0bcdc7250425b07485"
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
                                                       "605b96f1796fa533c84f1324"
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
                                                       "605b9969796fa533c84f3534"
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
                                                       "551d6176cdc7250425b069f1"
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
                                                       "605b959d8e87de3390e15fbe"
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
                                                       "605b959deb2c64338afa1b7d"
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
                                                       "5c5d3117f1a159315a0623c6"
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
                                                       "6105a619eff26851012ab460"
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
                                                       "55153fa9571a1674358bce1e"
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
                                                       "605b959d8e87de3390e15fbc"
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
                                                       "605b98bf796fa533c84f2f4c"
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
                                                       "5c557afa6178c50a3f95dbc9"
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
                                                       "6105a371eff268510129dc44"
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
                                                       "5c5d86068462d826f2df4a85"
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
                                                       "605b9952796fa533c84f3470"
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
                                                       "6105a55a8a437f50fb503fcf"
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
                                                       "605b96fd796fa533c84f1444"
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
                                                       "605b9a34796fa533c84f3a7c"
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
                                                       "6105a371eff26851012a292f"
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
                                                       "5c4067be0f4dd935d6d1e295"
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
                                                       "6105a55a8a437f50fb503a4c"
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
                                                       "6105a6bd8a437f50fb509c06"
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
                                                       "6105a7648a437f50fb51bb02"
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
                                                       "5c5b105674cbc7053180cd20"
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
                                                       "605b9a04796fa533c84f392c"
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
                                                       "5c5d88077f322a2d3338c0a6"
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
                                                       "55226ed7c60f68882604cc47"
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
                                                       "6105a6bd8a437f50fb50a204"
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
                                                       "6105a7648a437f50fb51593c"
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
                                                       "6105a55a8a437f50fb504e87"
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
                                                       "60f08f2c3209994a43b787d1"
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
                                                       "6105a830eff26851012b10ec"
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
                                                       "564be49c276f28b90faefb89"
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
                                                       "6105a55a8a437f50fb504b88"
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
                                                       "605b9707796fa533c84f1538"
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
                                                       "5c5bbdaad960ee4bdefc35bb"
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
                                                       "605b9a34796fa533c84f3a7a"
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
                                                       "605b96f4796fa533c84f1376"
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
                                                       "605b95a48e87de3390e16026"
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
                                                       "605b95a4eb2c64338afa1bf5"
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
                                                       "5c557b4b58df260a494415e6"
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
                                                       "6105a371eff268510129c5fd"
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
                                                       "5511589d1cc8615862ab6d48"
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
                                                       "6105a7648a437f50fb51c471"
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
                                                       "605b9849796fa533c84f2ace"
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
                                                       "605b96ea796fa533c84f1264"
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
                                                       "605b9800796fa533c84f279a"
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
                                                       "5c5d87a97f322a2d33389904"
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
                                                       "551186831cc8615862ab6f4d"
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
                                                       "5c5b105974cbc7053180cee0"
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
                                                       "6105a830eff26851012bc051"
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
                                                       "5c5b105374cbc7053180c9fa"
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
                                                       "605b9885796fa533c84f2d34"
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
                                                       "605b970e796fa533c84f1600"
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
                                                       "5c5bbda8d960ee4bdefc1bbd"
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
                                                       "6105a95beff26851012c04cc"
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
                                                       "6105a619eff26851012a62d3"
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
                                                       "6105a95beff26851012c1542"
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
                                                       "5519710fcdc7250425b04297"
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
                                                       "6105a830eff26851012b131a"
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
                                                       "6105a619eff26851012a9cc2"
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
                                                       "659f2a6f56be2f4668ea7e15"
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
                                                       "605b9778796fa533c84f1f02"
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
                                                       "5c5d3126f1a159315a062ab0"
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
                                                       "6105a6bd8a437f50fb507565"
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
                                                       "6105a830eff26851012b1825"
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
                                                       "6105a830eff26851012b1749"
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
                                                       "657153ac738ef37412ba5680"
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
                                                       "6105a830eff26851012b1aab"
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
                                                       "551fc63fcdc7250425b06c3c"
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
                                                       "6105a830eff26851012babe2"
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
                                                       "605b9a56796fa533c84f3b54"
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
                                                       "5c5b105c74cbc7053180d0f2"
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
                                                       "5c5b105874cbc7053180ce0e"
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
                                                       "6105a830eff26851012b1d48"
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
                                                       "6105a830eff26851012b288d"
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
                                                       "605b9a15796fa533c84f399c"
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
                                                       "605b9abd796fa533c84f3e40"
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
                                                       "5c5b105c74cbc7053180d158"
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
                                                       "6105a371eff268510129f254"
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
                                                       "605b973f796fa533c84f1a98"
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
                                                       "605b973f796fa533c84f1a9a"
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
                                                       "605b9a15796fa533c84f399e"
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
                                                       "6105a830eff26851012b1341"
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
                                                       "6105a830eff26851012b4229"
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
                                                       "6105a95beff26851012c161a"
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
                                                       "605b991e796fa533c84f32c6"
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
                                                       "605b9923796fa533c84f32f4"
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
                                                       "605b971b796fa533c84f1768"
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
                                                       "5c407016c1d9bf444e571825"
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
                                                       "6105a371eff2685101299471"
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
                                                       "6105a830eff26851012b14fc"
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
                                                       "5c5b104f74cbc7053180c67c"
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
                                                       "605b9924796fa533c84f32f6"
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
                                                       "605b98dd796fa533c84f3076"
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
                                                       "6105a830eff26851012b67e0"
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
                                                       "55b266c6e8837a284fe09662"
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
                                                       "605b98dc796fa533c84f3062"
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
                                                       "605b9936796fa533c84f3388"
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
                                                       "605b9903796fa533c84f31dc"
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
                                                       "55b266d2e8837a284fe0a933"
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
                                                       "6105a371eff268510129f24a"
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
                                                       "6105a371eff268510129ef7e"
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
                                                       "6105a371eff268510129de88"
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
                                                       "6105a371eff2685101299c13"
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
                                                       "6105a371eff26851012999ef"
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
                                                       "6105a371eff26851012999be"
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
                                                       "6105a371eff26851012987bc"
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
                                                       "6105a371eff2685101298794"
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
                                                       "6105a55a8a437f50fb50491b"
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
                                                       "55b265a5e8837a284fdf1670"
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
                                                       "5c5b105c74cbc7053180d17a"
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
                                                       "552fd37422482d6b63361f3c"
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
                                                       "6105a619eff26851012a9cb7"
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
                                                       "6105a619eff26851012a9e0b"
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
                                                       "55b2651de8837a284fdea5c3"
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
                                                       "6105a619eff26851012ab3d3"
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
                                                       "551189441cc8615862ab6f9b"
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
                                                       "5c5d87f27f322a2d3338a52c"
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
                                                       "605b97af796fa533c84f2318"
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
                                                       "6105a6bd8a437f50fb509dd0"
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
                                                       "6105a6bd8a437f50fb509dda"
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
                                                       "6105a6bd8a437f50fb509de4"
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
                                                       "605b97af796fa533c84f231a"
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
                                                       "5522735bc60f68882604ccce"
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
                                                       "6105a6bd8a437f50fb5111de"
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
                                                       "6105a7648a437f50fb5127ee"
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
                                                       "6105a7648a437f50fb515f74"
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
                                                       "551fcd39cdc7250425b06caf"
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
                                                       "54f440c46f95404053dd4689"
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
                                                       "5c5b105c74cbc7053180d194"
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
                                                       "55b265e2e8837a284fdf7e64"
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
                                                       "6105a7648a437f50fb51e9f6"
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
                                                       "6105a7648a437f50fb51ea14"
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
                                                       "6105a830eff26851012b130d"
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
                                                       "6105a830eff26851012b13fc"
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
                                                       "6105a830eff26851012b155d"
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
                                                       "5c5b104b74cbc7053180c28c"
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
                                                       "55b267fbe8837a284fe1be86"
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
                                                       "6105a830eff26851012b2b07"
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
                                                       "6105a830eff26851012bac0e"
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
                                                       "605b9abd796fa533c84f3e3e"
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
                                                       "5c4067bf0f4dd935d6d1e2ed"
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
                                                       "659f6f8ee1c9e55ab7de1950"
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
                                                       "6105a95beff26851012c163b"
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
                                                       "6105a95beff26851012c1655"
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
                                                       "5c5d86068462d826f2df4a2f"
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
                                                       "6105a831eff26851012bf8a0"
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
                                                       "5c5bbdabd960ee4bdefc39d9"
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
                                                       "6105a830eff26851012bc2b1"
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
                                                       "605b9a03796fa533c84f3926"
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
                                                       "6105a830eff26851012b9a39"
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
                                                       "6105a830eff26851012b9a19"
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
                                                       "5c5d88057f322a2d3338b284"
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
                                                       "571de6efbe020b0f52af792f"
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
                                                       "6105a830eff26851012b2656"
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
                                                       "6105a830eff26851012b2591"
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
                                                       "6105a830eff26851012b1da5"
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
                                                       "5c5d88057f322a2d3338aa08"
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
                                                       "6105a7648a437f50fb51eb8e"
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
                                                       "60f08f2c3209994a43b78b23"
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
                                                       "605b987f796fa533c84f2cee"
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
                                                       "605b9822796fa533c84f2928"
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
                                                       "5c5bbda9d960ee4bdefc2a77"
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
                                                       "6105a619eff26851012ace2d"
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
                                                       "605b9762796fa533c84f1d66"
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
                                                       "5c5d878c7f322a2d33388e98"
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
                                                       "6105a619eff26851012a8fe3"
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
                                                       "5dd70bfb26603627be1575bb"
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
                                                       "5511831d1cc8615862ab6ee3"
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
                                                       "55b2671de8837a284fe11425"
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
                                                       "6105a371eff26851012a3b1f"
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
                                                       "659dfb3756be2f4668ea72da"
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
                                                       "55118a191cc8615862ab6fc2"
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
                                                       "6105a371eff2685101298fe9"
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
                                                       "6105a371eff2685101297a55"
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
                                                       "6105a830eff26851012b2b25"
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
                                                       "6105a6bd8a437f50fb5089dc"
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
                                                       "6105a371eff26851012a39a7"
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
                                                       "6105a95beff26851012c4d54"
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
               "Subjects": {
                    "$first": "$MetaData.Subjects"
               },
               "Attributes": {
                    "$first": "$MetaData.Attributes"
               },
               "PrimaryBrandArchetype": {
                    "$first": "$MetaData.PrimaryBrandArchetype"
               },
               "SecondaryBrandArchetype": {
                    "$first": "$MetaData.SecondaryBrandArchetype"
               },
               "TertiaryBrandArchetype": {
                    "$first": "$MetaData.TertiaryBrandArchetype"
               },
               "MBTI": {
                    "$first": "$MetaData.MBTI"
               },
               "Countries": {
                    "$first": "$MetaData.Countries"
               },
               "Ethnicities": {
                    "$first": "$MetaData.Ethnicities"
               },
               "Gender": {
                    "$first": "$MetaData.Gender"
               },
               "EthnicDiversity": {
                    "$first": "$MetaData.EthnicDiversity"
               },
               "FamilyFriendly": {
                    "$first": "$MetaData.FamilyFriendly"
               },
               "Suggestive": {
                    "$first": "$MetaData.Suggestive"
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
                    "MetaData": {
                         "Subjects": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Subjects",
                                                       "water"
                                                  ]
                                             },
                                             "then": [
                                                  "water"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Subjects",
                                                  "$in": [
                                                       "water",
                                                       "$Subjects"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Subjects",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "water"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "Attributes": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Attributes",
                                                       "passion"
                                                  ]
                                             },
                                             "then": [
                                                  "passion"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Attributes",
                                                  "$in": [
                                                       "passion",
                                                       "$Attributes"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Attributes",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "passion"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "PrimaryBrandArchetype": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             "then": [
                                                  "Pure and Innocent"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             "then": [
                                                  "Lover and Sensualist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             "then": [
                                                  "Heroic Warrior"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             "then": [
                                                  "Dark Outlaw"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             "then": [
                                                  "Outdoor Naturalist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             "then": [
                                                  "Creative Spirit"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             "then": [
                                                  "Transformational Magician"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             "then": [
                                                  "Strategic Thinker"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Futurist"
                                                  ]
                                             },
                                             "then": [
                                                  "Futurist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Jester"
                                                  ]
                                             },
                                             "then": [
                                                  "Jester"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Wise Sage"
                                                  ]
                                             },
                                             "then": [
                                                  "Wise Sage"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             "then": [
                                                  "Lavish Ruler"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Nostalgia"
                                                  ]
                                             },
                                             "then": [
                                                  "Nostalgia"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Social Connectors"
                                                  ]
                                             },
                                             "then": [
                                                  "Social Connectors"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$PrimaryBrandArchetype",
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             "then": [
                                                  "Analytical Pragmatists or Grief and Strife"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$PrimaryBrandArchetype",
                                                  "$in": [
                                                       "Pure and Innocent",
                                                       "$PrimaryBrandArchetype"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$PrimaryBrandArchetype",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Pure and Innocent"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lover and Sensualist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Heroic Warrior"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Dark Outlaw"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Outdoor Naturalist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Creative Spirit"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Transformational Magician"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Strategic Thinker"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Futurist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Jester"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Wise Sage"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lavish Ruler"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Nostalgia"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Social Connectors"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Analytical Pragmatists or Grief and Strife"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "SecondaryBrandArchetype": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             "then": [
                                                  "Pure and Innocent"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             "then": [
                                                  "Lover and Sensualist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             "then": [
                                                  "Heroic Warrior"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             "then": [
                                                  "Dark Outlaw"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             "then": [
                                                  "Outdoor Naturalist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             "then": [
                                                  "Creative Spirit"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             "then": [
                                                  "Transformational Magician"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             "then": [
                                                  "Strategic Thinker"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Futurist"
                                                  ]
                                             },
                                             "then": [
                                                  "Futurist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Jester"
                                                  ]
                                             },
                                             "then": [
                                                  "Jester"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Wise Sage"
                                                  ]
                                             },
                                             "then": [
                                                  "Wise Sage"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             "then": [
                                                  "Lavish Ruler"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Nostalgia"
                                                  ]
                                             },
                                             "then": [
                                                  "Nostalgia"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Social Connectors"
                                                  ]
                                             },
                                             "then": [
                                                  "Social Connectors"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$SecondaryBrandArchetype",
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             "then": [
                                                  "Analytical Pragmatists or Grief and Strife"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$SecondaryBrandArchetype",
                                                  "$in": [
                                                       "Pure and Innocent",
                                                       "$SecondaryBrandArchetype"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$SecondaryBrandArchetype",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Pure and Innocent"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lover and Sensualist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Heroic Warrior"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Dark Outlaw"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Outdoor Naturalist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Creative Spirit"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Transformational Magician"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Strategic Thinker"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Futurist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Jester"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Wise Sage"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lavish Ruler"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Nostalgia"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Social Connectors"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Analytical Pragmatists or Grief and Strife"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "TertiaryBrandArchetype": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             "then": [
                                                  "Pure and Innocent"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             "then": [
                                                  "Lover and Sensualist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             "then": [
                                                  "Heroic Warrior"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             "then": [
                                                  "Dark Outlaw"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             "then": [
                                                  "Outdoor Naturalist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             "then": [
                                                  "Creative Spirit"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             "then": [
                                                  "Transformational Magician"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             "then": [
                                                  "Strategic Thinker"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Futurist"
                                                  ]
                                             },
                                             "then": [
                                                  "Futurist"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Jester"
                                                  ]
                                             },
                                             "then": [
                                                  "Jester"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Wise Sage"
                                                  ]
                                             },
                                             "then": [
                                                  "Wise Sage"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             "then": [
                                                  "Lavish Ruler"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Nostalgia"
                                                  ]
                                             },
                                             "then": [
                                                  "Nostalgia"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Social Connectors"
                                                  ]
                                             },
                                             "then": [
                                                  "Social Connectors"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$TertiaryBrandArchetype",
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             "then": [
                                                  "Analytical Pragmatists or Grief and Strife"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$TertiaryBrandArchetype",
                                                  "$in": [
                                                       "Pure and Innocent",
                                                       "$TertiaryBrandArchetype"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$TertiaryBrandArchetype",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Pure and Innocent"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lover and Sensualist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Heroic Warrior"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Dark Outlaw"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Outdoor Naturalist"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Creative Spirit"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Transformational Magician"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Strategic Thinker"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Futurist"

                                                         ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Jester"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Wise Sage"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Lavish Ruler"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Nostalgia"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Social Connectors"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Analytical Pragmatists or Grief and Strife"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "MBTI": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$MBTI",
                                                       "INFJ"
                                                  ]
                                             },
                                             "then": [
                                                  "INFJ"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$MBTI",
                                                       "INJF"
                                                  ]
                                             },
                                             "then": [
                                                  "INJF"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$MBTI",
                                                  "$in": [
                                                       "INFJ",
                                                       "$MBTI"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$MBTI",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "INFJ"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "INJF"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "Countries": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Countries",
                                                       "NA"
                                                  ]
                                             },
                                             "then": [
                                                  "NA"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Countries",
                                                  "$in": [
                                                       "NA",
                                                       "$Countries"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Countries",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "NA"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "Ethnicities": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Ethnicities",
                                                       "African"
                                                  ]
                                             },
                                             "then": [
                                                  "African"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Ethnicities",
                                                  "$in": [
                                                       "African",
                                                       "$Ethnicities"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Ethnicities",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "African"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "Gender": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Gender",
                                                       "Female"
                                                  ]
                                             },
                                             "then": [
                                                  "Female"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Gender",
                                                       "Male"
                                                  ]
                                             },
                                             "then": [
                                                  "Male"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Gender",
                                                  "$in": [
                                                       "Female",
                                                       "$Gender"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Gender",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Female"
                                                                      ]
                                                                 },
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "Male"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "EthnicDiversity": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$EthnicDiversity",
                                                       "false"
                                                  ]
                                             },
                                             "then": [
                                                  "false"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$EthnicDiversity",
                                                  "$in": [
                                                       "false",
                                                       "$EthnicDiversity"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$EthnicDiversity",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "false"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "FamilyFriendly": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$FamilyFriendly",
                                                       "false"
                                                  ]
                                             },
                                             "then": [
                                                  "false"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$FamilyFriendly",
                                                  "$in": [
                                                       "false",
                                                       "$FamilyFriendly"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$FamilyFriendly",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "false"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         },
                         "Suggestive": {
                              "$switch": {
                                   "branches": [
                                        {
                                             "case": {
                                                  "$eq": [
                                                       "$Suggestive",
                                                       "false"
                                                  ]
                                             },
                                             "then": [
                                                  "false"
                                             ]
                                        },
                                        {
                                             "case": {
                                                  "$isArray": "$Suggestive",
                                                  "$in": [
                                                       "false",
                                                       "$Suggestive"
                                                  ]
                                             },
                                             "then": {
                                                  "$filter": {
                                                       "input": "$Suggestive",
                                                       "as": "type",
                                                       "cond": {
                                                            "$or": [
                                                                 {
                                                                      "$eq": [
                                                                           "$$type",
                                                                           "false"
                                                                      ]
                                                                 }
                                                            ]
                                                       }
                                                  }
                                             }
                                        }
                                   ],
                                   "default": "$$REMOVE"
                              }
                         }
                    },
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
                    },
                    "MediaSelectionCriteriaArr": {
                         "$setUnion": [
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Subjects",
                                                            "water"
                                                       ]
                                                  },
                                                  "then": [
                                                       "water"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Subjects",
                                                       "$in": [
                                                            "water",
                                                            "$Subjects"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Subjects",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "water"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Attributes",
                                                            "passion"
                                                       ]
                                                  },
                                                  "then": [
                                                       "passion"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Attributes",
                                                       "$in": [
                                                            "passion",
                                                            "$Attributes"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Attributes",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "passion"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Pure and Innocent"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Lover and Sensualist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Heroic Warrior"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Dark Outlaw"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Outdoor Naturalist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Creative Spirit"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Transformational Magician"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Strategic Thinker"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Futurist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Futurist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Jester"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Jester"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Wise Sage"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Wise Sage"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Lavish Ruler"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Nostalgia"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Nostalgia"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Social Connectors"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Social Connectors"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$PrimaryBrandArchetype",
                                                            "Analytical Pragmatists or Grief and Strife"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$PrimaryBrandArchetype",
                                                       "$in": [
                                                            "Pure and Innocent",
                                                            "$PrimaryBrandArchetype"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$PrimaryBrandArchetype",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Pure and Innocent"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lover and Sensualist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Heroic Warrior"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Dark Outlaw"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Outdoor Naturalist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Creative Spirit"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Transformational Magician"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Strategic Thinker"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Futurist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Jester"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Wise Sage"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lavish Ruler"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Nostalgia"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Social Connectors"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Analytical Pragmatists or Grief and Strife"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Pure and Innocent"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Lover and Sensualist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Heroic Warrior"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Dark Outlaw"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Outdoor Naturalist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Creative Spirit"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Transformational Magician"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Strategic Thinker"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Futurist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Futurist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Jester"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Jester"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Wise Sage"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Wise Sage"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Lavish Ruler"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Nostalgia"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Nostalgia"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Social Connectors"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Social Connectors"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$SecondaryBrandArchetype",
                                                            "Analytical Pragmatists or Grief and Strife"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$SecondaryBrandArchetype",
                                                       "$in": [
                                                            "Pure and Innocent",
                                                            "$SecondaryBrandArchetype"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$SecondaryBrandArchetype",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {

                                    "$eq": [
                                                                                "$$type",
                                                                                "Pure and Innocent"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lover and Sensualist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Heroic Warrior"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Dark Outlaw"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Outdoor Naturalist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Creative Spirit"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Transformational Magician"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Strategic Thinker"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Futurist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Jester"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Wise Sage"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lavish Ruler"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Nostalgia"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Social Connectors"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Analytical Pragmatists or Grief and Strife"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Pure and Innocent"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Pure and Innocent"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Lover and Sensualist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lover and Sensualist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Heroic Warrior"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Heroic Warrior"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Dark Outlaw"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Dark Outlaw"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Outdoor Naturalist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Outdoor Naturalist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Creative Spirit"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Creative Spirit"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Transformational Magician"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Transformational Magician"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Strategic Thinker"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Strategic Thinker"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Futurist"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Futurist"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Jester"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Jester"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Wise Sage"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Wise Sage"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Lavish Ruler"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Lavish Ruler"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Nostalgia"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Nostalgia"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Social Connectors"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Social Connectors"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$TertiaryBrandArchetype",
                                                            "Analytical Pragmatists or Grief and Strife"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Analytical Pragmatists or Grief and Strife"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$TertiaryBrandArchetype",
                                                       "$in": [
                                                            "Pure and Innocent",
                                                            "$TertiaryBrandArchetype"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$TertiaryBrandArchetype",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Pure and Innocent"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lover and Sensualist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Heroic Warrior"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Dark Outlaw"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Outdoor Naturalist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Creative Spirit"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Transformational Magician"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Strategic Thinker"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Futurist"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Jester"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Wise Sage"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Lavish Ruler"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Nostalgia"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Social Connectors"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Analytical Pragmatists or Grief and Strife"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$MBTI",
                                                            "INFJ"
                                                       ]
                                                  },
                                                  "then": [
                                                       "INFJ"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$MBTI",
                                                            "INJF"
                                                       ]
                                                  },
                                                  "then": [
                                                       "INJF"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$MBTI",
                                                       "$in": [
                                                            "INFJ",
                                                            "$MBTI"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$MBTI",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "INFJ"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "INJF"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Countries",
                                                            "NA"
                                                       ]
                                                  },
                                                  "then": [
                                                       "NA"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Countries",
                                                       "$in": [
                                                            "NA",
                                                            "$Countries"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Countries",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "NA"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Ethnicities",
                                                            "African"
                                                       ]
                                                  },
                                                  "then": [
                                                       "African"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Ethnicities",
                                                       "$in": [
                                                            "African",
                                                            "$Ethnicities"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Ethnicities",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "African"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Gender",
                                                            "Female"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Female"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Gender",
                                                            "Male"
                                                       ]
                                                  },
                                                  "then": [
                                                       "Male"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Gender",
                                                       "$in": [
                                                            "Female",
                                                            "$Gender"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Gender",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Female"
                                                                           ]
                                                                      },
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "Male"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$EthnicDiversity",
                                                            "false"
                                                       ]
                                                  },
                                                  "then": [
                                                       "false"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$EthnicDiversity",
                                                       "$in": [
                                                            "false",
                                                            "$EthnicDiversity"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$EthnicDiversity",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "false"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$FamilyFriendly",
                                                            "false"
                                                       ]
                                                  },
                                                  "then": [
                                                       "false"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$FamilyFriendly",
                                                       "$in": [
                                                            "false",
                                                            "$FamilyFriendly"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$FamilyFriendly",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "false"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              },
                              {
                                   "$switch": {
                                        "branches": [
                                             {
                                                  "case": {
                                                       "$eq": [
                                                            "$Suggestive",
                                                            "false"
                                                       ]
                                                  },
                                                  "then": [
                                                       "false"
                                                  ]
                                             },
                                             {
                                                  "case": {
                                                       "$isArray": "$Suggestive",
                                                       "$in": [
                                                            "false",
                                                            "$Suggestive"
                                                       ]
                                                  },
                                                  "then": {
                                                       "$filter": {
                                                            "input": "$Suggestive",
                                                            "as": "type",
                                                            "cond": {
                                                                 "$or": [
                                                                      {
                                                                           "$eq": [
                                                                                "$$type",
                                                                                "false"
                                                                           ]
                                                                      }
                                                                 ]
                                                            }
                                                       }
                                                  }
                                             }
                                        ],
                                        "default": []
                                   }
                              }
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
                    "Title": "$value.Title",
                    "Prompt": "$value.Prompt",
                    "Locator": "$value.Locator",
                    "Location": "$value.Location",
                    "MediaType": "$value.MediaType",
                    "ContentType": "$value.ContentType",
                    "UploadedOn": "$value.UploadedOn",
                    "Content": "$value.Content",
                    "thumbnail": "$value.thumbnail",
                    "IsPrivate": "$value.IsPrivate",
                    "RandomSortId": "$value.RandomSortId",
                    "IsUnsplashImage": "$value.IsUnsplashImage",
                    "ViewsCount": "$value.ViewsCount",
                    "Ranks": "$value.Ranks",
                    "Lightness": "$value.Lightness",
                    "DominantColors": "$value.DominantColors",
                    "SecondaryKeywords": "$value.SecondaryKeywords",
                    "SecondaryKeywordsCount": "$value.SecondaryKeywordsCount",
                    "AllMetaData": "$value.AllMetaData",
                    "MetaData": "$value.MetaData",
                    "MediaSelectionCriteriaArr": "$value.MediaSelectionCriteriaArr",
                    "MediaSelectionCriteriaCount": {
                         "$size": {
                              "$ifNull": [
                                   "$value.MediaSelectionCriteriaArr",
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