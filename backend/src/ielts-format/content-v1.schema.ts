/**
 * JSON Schema (draft 2020-12) of the "ielts-content 1.0.0" format proposed in the
 * research hand-off of 2 November 2026 (docs/handoff-2026-11-02). Copied verbatim;
 * content-v1.ts converts documents in this format into an IELTS Test Package 1.1.
 */
/* eslint-disable */
export const CONTENT_V1_JSON_SCHEMA: Record<string, unknown> = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:eduportal:ielts:content:1.0.0",
  "title": "Proposed EduPortal IELTS content contract v1",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "const": "1.0.0"
    },
    "contentId": {
      "type": "string",
      "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "testType": {
      "enum": [
        "academic",
        "general_training"
      ]
    },
    "language": {
      "const": "en"
    },
    "deliveryProfile": {
      "const": "computer"
    },
    "fixtureOnly": {
      "type": "boolean"
    },
    "assets": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Asset"
      },
      "minItems": 0
    },
    "listening": {
      "type": "object",
      "properties": {
        "timingMode": {
          "const": "embedded_audio"
        },
        "finalReviewSeconds": {
          "const": 120
        },
        "parts": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ListeningPart"
          },
          "minItems": 4,
          "maxItems": 4
        }
      },
      "required": [
        "timingMode",
        "finalReviewSeconds",
        "parts"
      ],
      "additionalProperties": false
    },
    "reading": {
      "type": "object",
      "properties": {
        "durationSeconds": {
          "const": 3600
        },
        "sections": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/ReadingSection"
          },
          "minItems": 3,
          "maxItems": 3
        }
      },
      "required": [
        "durationSeconds",
        "sections"
      ],
      "additionalProperties": false
    },
    "writing": {
      "type": "object",
      "properties": {
        "durationSeconds": {
          "const": 3600
        },
        "tasks": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/WritingTask"
          },
          "minItems": 2,
          "maxItems": 2
        }
      },
      "required": [
        "durationSeconds",
        "tasks"
      ],
      "additionalProperties": false
    },
    "speaking": {
      "$ref": "#/$defs/Speaking"
    },
    "answerKey": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Key"
      },
      "minItems": 1
    },
    "examinerMaterials": {
      "type": "object",
      "properties": {
        "listeningTranscripts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "partId": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "text": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "partId",
              "text"
            ],
            "additionalProperties": false
          },
          "minItems": 0
        },
        "writingNotes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "taskId": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "text": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "taskId",
              "text"
            ],
            "additionalProperties": false
          },
          "minItems": 0
        },
        "speakingNotes": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "listeningTranscripts",
        "writingNotes",
        "speakingNotes"
      ],
      "additionalProperties": false
    },
    "scoring": {
      "type": "object",
      "properties": {
        "listeningBandTableId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "readingBandTableId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "writingPolicyId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            {
              "type": "null"
            }
          ]
        },
        "speakingPolicyId": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "listeningBandTableId",
        "readingBandTableId",
        "writingPolicyId",
        "speakingPolicyId"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "schemaVersion",
    "contentId",
    "title",
    "testType",
    "language",
    "deliveryProfile",
    "fixtureOnly",
    "assets",
    "listening",
    "reading",
    "writing",
    "speaking",
    "answerKey",
    "examinerMaterials",
    "scoring"
  ],
  "additionalProperties": false,
  "$defs": {
    "WordRule": {
      "type": "object",
      "properties": {
        "mode": {
          "enum": [
            "words_only",
            "number_only",
            "words_and_number",
            "words_or_number"
          ]
        },
        "maxWords": {
          "type": "integer",
          "minimum": 0,
          "maximum": 20
        }
      },
      "required": [
        "mode",
        "maxWords"
      ],
      "additionalProperties": false
    },
    "Option": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "label": {
          "type": "string",
          "minLength": 1
        },
        "text": {
          "type": "string",
          "minLength": 1
        },
        "sourceRef": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        }
      },
      "required": [
        "id",
        "label",
        "text"
      ],
      "additionalProperties": false
    },
    "Response": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "choice_one"
            },
            "optionIds": {
              "type": "array",
              "items": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "minItems": 2,
              "uniqueItems": true
            }
          },
          "required": [
            "kind",
            "optionIds"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "choice_many"
            },
            "optionIds": {
              "type": "array",
              "items": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "minItems": 3,
              "uniqueItems": true
            },
            "selectionCount": {
              "type": "integer",
              "minimum": 2,
              "maximum": 10
            }
          },
          "required": [
            "kind",
            "optionIds",
            "selectionCount"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "judgement"
            },
            "values": {
              "oneOf": [
                {
                  "const": [
                    "TRUE",
                    "FALSE",
                    "NOT_GIVEN"
                  ]
                },
                {
                  "const": [
                    "YES",
                    "NO",
                    "NOT_GIVEN"
                  ]
                }
              ]
            }
          },
          "required": [
            "kind",
            "values"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "text"
            },
            "wordRule": {
              "$ref": "#/$defs/WordRule"
            }
          },
          "required": [
            "kind",
            "wordRule"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "text_set"
            },
            "wordRule": {
              "$ref": "#/$defs/WordRule"
            },
            "orderMatters": {
              "const": false
            }
          },
          "required": [
            "kind",
            "wordRule",
            "orderMatters"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Item": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "numbers": {
          "type": "array",
          "items": {
            "type": "integer",
            "minimum": 1,
            "maximum": 40
          },
          "minItems": 1,
          "maxItems": 10,
          "uniqueItems": true
        },
        "prompt": {
          "type": "string",
          "minLength": 1
        },
        "response": {
          "$ref": "#/$defs/Response"
        },
        "targetRef": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        }
      },
      "required": [
        "id",
        "numbers",
        "prompt",
        "response"
      ],
      "additionalProperties": false
    },
    "Target": {
      "type": "object",
      "properties": {
        "itemId": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "x": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "y": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "width": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "height": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "itemId",
        "x",
        "y",
        "width",
        "height"
      ],
      "additionalProperties": false
    },
    "Location": {
      "type": "object",
      "properties": {
        "optionId": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "x": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "y": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "optionId",
        "x",
        "y"
      ],
      "additionalProperties": false
    },
    "Layout": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "list"
            }
          },
          "required": [
            "kind"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "matching"
            }
          },
          "required": [
            "kind"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "enum": [
                "form",
                "note",
                "summary",
                "sentence"
              ]
            },
            "blocks": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            }
          },
          "required": [
            "kind",
            "blocks"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "table"
            },
            "columns": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            },
            "rows": {
              "type": "array",
              "items": {
                "type": "array",
                "items": {
                  "type": "string",
                  "minLength": 1
                },
                "minItems": 1
              },
              "minItems": 1
            }
          },
          "required": [
            "kind",
            "columns",
            "rows"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "flow_chart"
            },
            "nodes": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
                  },
                  "body": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "required": [
                  "id",
                  "body"
                ],
                "additionalProperties": false
              },
              "minItems": 1
            },
            "edges": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "from": {
                    "type": "string",
                    "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
                  },
                  "to": {
                    "type": "string",
                    "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
                  }
                },
                "required": [
                  "from",
                  "to"
                ],
                "additionalProperties": false
              },
              "minItems": 1
            }
          },
          "required": [
            "kind",
            "nodes",
            "edges"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "visual"
            },
            "assetId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "visualKind": {
              "enum": [
                "map",
                "plan",
                "diagram",
                "pictures"
              ]
            },
            "arrangement": {
              "const": "blank_targets"
            },
            "targets": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/Target"
              },
              "minItems": 1
            }
          },
          "required": [
            "kind",
            "assetId",
            "visualKind",
            "arrangement",
            "targets"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "kind": {
              "const": "visual"
            },
            "assetId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "visualKind": {
              "enum": [
                "map",
                "plan",
                "diagram"
              ]
            },
            "arrangement": {
              "const": "location_options"
            },
            "locations": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/Location"
              },
              "minItems": 2
            }
          },
          "required": [
            "kind",
            "assetId",
            "visualKind",
            "arrangement",
            "locations"
          ],
          "additionalProperties": false
        }
      ]
    },
    "Group": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "variantId": {
          "enum": [
            "listening.multiple_choice.single",
            "listening.multiple_choice.multi",
            "reading.multiple_choice.single",
            "reading.multiple_choice.multi",
            "listening.matching",
            "listening.label.map.text.blank",
            "listening.label.map.choice_one.blank",
            "listening.label.map.location",
            "listening.label.plan.text.blank",
            "listening.label.plan.choice_one.blank",
            "listening.label.plan.location",
            "listening.label.diagram.text.blank",
            "listening.label.diagram.choice_one.blank",
            "listening.label.diagram.location",
            "listening.label.pictures.choice",
            "listening.completion.form.text",
            "listening.completion.form.choice_one",
            "listening.completion.note.text",
            "listening.completion.note.choice_one",
            "listening.completion.table.text",
            "listening.completion.table.choice_one",
            "listening.completion.flow_chart.text",
            "listening.completion.flow_chart.choice_one",
            "listening.completion.summary.text",
            "listening.completion.summary.choice_one",
            "listening.sentence_completion",
            "listening.short_answer",
            "listening.short_answer.set",
            "reading.multiple_choice.title",
            "reading.information_tfng",
            "reading.writer_ynng",
            "reading.matching_information",
            "reading.matching_headings",
            "reading.matching_features",
            "reading.matching_endings",
            "reading.sentence_completion",
            "reading.completion.summary.text",
            "reading.completion.summary.choice_one",
            "reading.completion.note.text",
            "reading.completion.note.choice_one",
            "reading.completion.table.text",
            "reading.completion.table.choice_one",
            "reading.completion.flow_chart.text",
            "reading.completion.flow_chart.choice_one",
            "reading.label.diagram",
            "reading.short_answer"
          ]
        },
        "taskType": {
          "enum": [
            "completion",
            "information_tfng",
            "matching",
            "matching_endings",
            "matching_features",
            "matching_headings",
            "matching_information",
            "multiple_choice",
            "sentence_completion",
            "short_answer",
            "visual_labelling",
            "writer_ynng"
          ]
        },
        "instructions": {
          "type": "string",
          "minLength": 1
        },
        "sourceRefs": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
          },
          "minItems": 0,
          "uniqueItems": true
        },
        "optionReuse": {
          "enum": [
            "allowed",
            "forbidden",
            "not_applicable"
          ]
        },
        "options": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Option"
          },
          "minItems": 0
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Item"
          },
          "minItems": 1
        },
        "layout": {
          "$ref": "#/$defs/Layout"
        }
      },
      "required": [
        "id",
        "variantId",
        "taskType",
        "instructions",
        "sourceRefs",
        "optionReuse",
        "options",
        "items",
        "layout"
      ],
      "additionalProperties": false
    },
    "Paragraph": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "label": {
          "type": "string",
          "minLength": 1
        },
        "text": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": [
        "id",
        "label",
        "text"
      ],
      "additionalProperties": false
    },
    "Passage": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "paragraphs": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Paragraph"
          },
          "minItems": 1
        },
        "glossary": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "term": {
                "type": "string",
                "minLength": 1
              },
              "definition": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "term",
              "definition"
            ],
            "additionalProperties": false
          },
          "minItems": 0
        },
        "imageAssetIds": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
          },
          "minItems": 0,
          "uniqueItems": true
        }
      },
      "required": [
        "id",
        "title",
        "paragraphs",
        "glossary",
        "imageAssetIds"
      ],
      "additionalProperties": false
    },
    "Asset": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "storageKey": {
              "type": "string",
              "minLength": 1
            },
            "mimeType": {
              "type": "string",
              "minLength": 1
            },
            "byteLength": {
              "type": "integer",
              "minimum": 1
            },
            "status": {
              "enum": [
                "fixture",
                "ready"
              ]
            },
            "kind": {
              "const": "image"
            },
            "width": {
              "type": "integer",
              "minimum": 1
            },
            "height": {
              "type": "integer",
              "minimum": 1
            }
          },
          "required": [
            "id",
            "storageKey",
            "mimeType",
            "byteLength",
            "status",
            "kind",
            "width",
            "height"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "storageKey": {
              "type": "string",
              "minLength": 1
            },
            "mimeType": {
              "type": "string",
              "minLength": 1
            },
            "byteLength": {
              "type": "integer",
              "minimum": 1
            },
            "status": {
              "enum": [
                "fixture",
                "ready"
              ]
            },
            "kind": {
              "const": "audio"
            },
            "durationMs": {
              "type": "integer",
              "minimum": 1
            }
          },
          "required": [
            "id",
            "storageKey",
            "mimeType",
            "byteLength",
            "status",
            "kind",
            "durationMs"
          ],
          "additionalProperties": false
        }
      ]
    },
    "ListeningPart": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "part": {
          "type": "integer",
          "minimum": 1,
          "maximum": 4
        },
        "context": {
          "enum": [
            "social_dialogue",
            "social_monologue",
            "educational_discussion",
            "academic_monologue"
          ]
        },
        "audioAssetId": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "groups": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Group"
          },
          "minItems": 1
        }
      },
      "required": [
        "id",
        "part",
        "context",
        "audioAssetId",
        "groups"
      ],
      "additionalProperties": false
    },
    "ReadingSection": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "section": {
          "type": "integer",
          "minimum": 1,
          "maximum": 3
        },
        "context": {
          "enum": [
            "academic",
            "social_survival",
            "workplace",
            "general_interest"
          ]
        },
        "passages": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Passage"
          },
          "minItems": 1
        },
        "groups": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Group"
          },
          "minItems": 1
        }
      },
      "required": [
        "id",
        "section",
        "context",
        "passages",
        "groups"
      ],
      "additionalProperties": false
    },
    "WritingTask": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "prompt": {
              "type": "string",
              "minLength": 1
            },
            "directives": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            },
            "kind": {
              "const": "academic_task1"
            },
            "number": {
              "const": 1
            },
            "minWords": {
              "const": 150
            },
            "recommendedSeconds": {
              "const": 1200
            },
            "visualType": {
              "enum": [
                "line_chart",
                "bar_chart",
                "pie_chart",
                "table",
                "process",
                "map",
                "object_diagram",
                "mixed"
              ]
            },
            "visualAssetIds": {
              "type": "array",
              "items": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "minItems": 1,
              "uniqueItems": true
            }
          },
          "required": [
            "id",
            "prompt",
            "directives",
            "kind",
            "number",
            "minWords",
            "recommendedSeconds",
            "visualType",
            "visualAssetIds"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "prompt": {
              "type": "string",
              "minLength": 1
            },
            "directives": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            },
            "kind": {
              "const": "general_task1"
            },
            "number": {
              "const": 1
            },
            "minWords": {
              "const": 150
            },
            "recommendedSeconds": {
              "const": 1200
            },
            "register": {
              "enum": [
                "personal",
                "semi_formal",
                "formal"
              ]
            },
            "recipient": {
              "type": "string",
              "minLength": 1
            },
            "scenario": {
              "type": "string",
              "minLength": 1
            },
            "bulletPoints": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 3,
              "maxItems": 3
            },
            "opening": {
              "type": "string",
              "minLength": 1
            },
            "purposeTags": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1,
              "uniqueItems": true
            }
          },
          "required": [
            "id",
            "prompt",
            "directives",
            "kind",
            "number",
            "minWords",
            "recommendedSeconds",
            "register",
            "recipient",
            "scenario",
            "bulletPoints",
            "opening",
            "purposeTags"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "prompt": {
              "type": "string",
              "minLength": 1
            },
            "directives": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            },
            "kind": {
              "const": "task2"
            },
            "number": {
              "const": 2
            },
            "minWords": {
              "const": 250
            },
            "recommendedSeconds": {
              "const": 2400
            },
            "essayTags": {
              "type": "array",
              "items": {
                "enum": [
                  "opinion",
                  "discussion",
                  "advantages_disadvantages",
                  "outweigh",
                  "positive_negative",
                  "cause_solution",
                  "cause_effect",
                  "problem_solution",
                  "multi_part",
                  "mixed"
                ]
              },
              "minItems": 1,
              "uniqueItems": true
            }
          },
          "required": [
            "id",
            "prompt",
            "directives",
            "kind",
            "number",
            "minWords",
            "recommendedSeconds",
            "essayTags"
          ],
          "additionalProperties": false
        }
      ]
    },
    "SpeakingPrompt": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        },
        "text": {
          "type": "string",
          "minLength": 1
        },
        "audioAssetId": {
          "type": "string",
          "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
        }
      },
      "required": [
        "id",
        "text"
      ],
      "additionalProperties": false
    },
    "Speaking": {
      "type": "object",
      "properties": {
        "executionMode": {
          "enum": [
            "live_examiner",
            "recorded_simulation"
          ]
        },
        "part1": {
          "type": "object",
          "properties": {
            "topics": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
                  },
                  "topic": {
                    "type": "string",
                    "minLength": 1
                  },
                  "prompts": {
                    "type": "array",
                    "items": {
                      "$ref": "#/$defs/SpeakingPrompt"
                    },
                    "minItems": 1
                  }
                },
                "required": [
                  "id",
                  "topic",
                  "prompts"
                ],
                "additionalProperties": false
              },
              "minItems": 1
            },
            "minSeconds": {
              "const": 240
            },
            "maxSeconds": {
              "const": 300
            }
          },
          "required": [
            "topics",
            "minSeconds",
            "maxSeconds"
          ],
          "additionalProperties": false
        },
        "part2": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "topic": {
              "type": "string",
              "minLength": 1
            },
            "bulletPoints": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1
            },
            "finalPrompt": {
              "type": "string",
              "minLength": 1
            },
            "preparationSeconds": {
              "const": 60
            },
            "maxTalkSeconds": {
              "const": 120
            },
            "roundingQuestions": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/SpeakingPrompt"
              },
              "minItems": 1,
              "maxItems": 2
            }
          },
          "required": [
            "id",
            "topic",
            "bulletPoints",
            "finalPrompt",
            "preparationSeconds",
            "maxTalkSeconds",
            "roundingQuestions"
          ],
          "additionalProperties": false
        },
        "part3": {
          "type": "object",
          "properties": {
            "linkedPart2Topic": {
              "type": "string",
              "minLength": 1
            },
            "prompts": {
              "type": "array",
              "items": {
                "$ref": "#/$defs/SpeakingPrompt"
              },
              "minItems": 1
            },
            "minSeconds": {
              "const": 240
            },
            "maxSeconds": {
              "const": 300
            }
          },
          "required": [
            "linkedPart2Topic",
            "prompts",
            "minSeconds",
            "maxSeconds"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "executionMode",
        "part1",
        "part2",
        "part3"
      ],
      "additionalProperties": false
    },
    "Key": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "itemId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "explanation": {
              "type": "string",
              "minLength": 1
            },
            "kind": {
              "const": "choice_one"
            },
            "acceptedOptionId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            }
          },
          "required": [
            "itemId",
            "explanation",
            "kind",
            "acceptedOptionId"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "itemId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "explanation": {
              "type": "string",
              "minLength": 1
            },
            "kind": {
              "const": "choice_many"
            },
            "acceptedOptionIds": {
              "type": "array",
              "items": {
                "type": "string",
                "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
              },
              "minItems": 2,
              "uniqueItems": true
            }
          },
          "required": [
            "itemId",
            "explanation",
            "kind",
            "acceptedOptionIds"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "itemId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "explanation": {
              "type": "string",
              "minLength": 1
            },
            "kind": {
              "const": "judgement"
            },
            "value": {
              "enum": [
                "TRUE",
                "FALSE",
                "YES",
                "NO",
                "NOT_GIVEN"
              ]
            }
          },
          "required": [
            "itemId",
            "explanation",
            "kind",
            "value"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "itemId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "explanation": {
              "type": "string",
              "minLength": 1
            },
            "kind": {
              "const": "text"
            },
            "accepted": {
              "type": "array",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "minItems": 1,
              "uniqueItems": true
            }
          },
          "required": [
            "itemId",
            "explanation",
            "kind",
            "accepted"
          ],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "itemId": {
              "type": "string",
              "pattern": "^[A-Za-z][A-Za-z0-9_.-]{0,127}$"
            },
            "explanation": {
              "type": "string",
              "minLength": 1
            },
            "kind": {
              "const": "text_set"
            },
            "answerUnits": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "accepted": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "minLength": 1
                    },
                    "minItems": 1,
                    "uniqueItems": true
                  }
                },
                "required": [
                  "accepted"
                ],
                "additionalProperties": false
              },
              "minItems": 2
            }
          },
          "required": [
            "itemId",
            "explanation",
            "kind",
            "answerUnits"
          ],
          "additionalProperties": false
        }
      ]
    }
  }
};
