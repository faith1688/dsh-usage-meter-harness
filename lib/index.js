import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import z from "@deepseek-ai/schemastery";
import { z as z$1 } from "zod";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region lib/types/prices/providers/anthropic.js
const anthropicModels = {
	"anthropic/claude-fable-5": {
		inputPerM: 10,
		outputPerM: 50,
		cacheReadPerM: 1,
		cacheWritePerM: 12.5,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-mythos-5": {
		inputPerM: 10,
		outputPerM: 50,
		cacheReadPerM: 1,
		cacheWritePerM: 12.5,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-opus-5": {
		inputPerM: 5,
		outputPerM: 25,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-opus-4-8": {
		inputPerM: 5,
		outputPerM: 25,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-opus-4-7": {
		inputPerM: 5,
		outputPerM: 25,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-opus-4-6": {
		inputPerM: 5,
		outputPerM: 25,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-opus-4-5": {
		inputPerM: 5,
		outputPerM: 25,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-sonnet-5": {
		inputPerM: 2,
		outputPerM: 10,
		cacheReadPerM: .2,
		cacheWritePerM: 2.5,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-sonnet-4-6": {
		inputPerM: 3,
		outputPerM: 15,
		cacheReadPerM: .3,
		cacheWritePerM: 3.75,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-sonnet-4-5": {
		inputPerM: 3,
		outputPerM: 15,
		cacheReadPerM: .3,
		cacheWritePerM: 3.75,
		currency: "USD",
		source: "bundled"
	},
	"anthropic/claude-haiku-4-5": {
		inputPerM: 1,
		outputPerM: 5,
		cacheReadPerM: .1,
		cacheWritePerM: 1.25,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/baichuan.js
const baichuanModels = {
	"baichuan/baichuan4": {
		inputPerM: 100,
		outputPerM: 100,
		combinedPerM: 100,
		currency: "CNY",
		source: "bundled"
	},
	"baichuan/baichuan4-turbo": {
		inputPerM: 15,
		outputPerM: 15,
		combinedPerM: 15,
		currency: "CNY",
		source: "bundled"
	},
	"baichuan/baichuan4-air": {
		inputPerM: .98,
		outputPerM: .98,
		combinedPerM: .98,
		currency: "CNY",
		source: "bundled"
	},
	"baichuan/baichuan-m2": {
		inputPerM: 2,
		outputPerM: 20,
		currency: "CNY",
		source: "bundled"
	},
	"baichuan/baichuan-m3-plus": {
		inputPerM: 0,
		outputPerM: 0,
		combinedPerM: 0,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/baidu.js
const baiduModels = {
	"baidu/ernie-5.0": {
		inputPerM: 6,
		outputPerM: 24,
		currency: "CNY",
		source: "bundled"
	},
	"baidu/ernie-5.1": {
		inputPerM: 4,
		outputPerM: 18,
		currency: "CNY",
		source: "bundled"
	},
	"baidu/ernie-x1.1": {
		inputPerM: 1,
		outputPerM: 4,
		currency: "CNY",
		source: "bundled"
	},
	"baidu/ernie-4.5": {
		inputPerM: 4,
		outputPerM: 16,
		currency: "CNY",
		source: "bundled"
	},
	"baidu/ernie-4.5-turbo": {
		inputPerM: .8,
		outputPerM: 3.2,
		currency: "CNY",
		source: "bundled"
	},
	"baidu/ernie-x1-turbo": {
		inputPerM: 1,
		outputPerM: 4,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/cohere.js
const cohereModels = {
	"cohere/command-a-plus": {
		inputPerM: 2.5,
		outputPerM: 10,
		currency: "USD",
		source: "bundled"
	},
	"cohere/command-a": {
		inputPerM: 2.5,
		outputPerM: 10,
		currency: "USD",
		source: "bundled"
	},
	"cohere/command-r-plus": {
		inputPerM: 2.5,
		outputPerM: 10,
		currency: "USD",
		source: "bundled"
	},
	"cohere/command-r": {
		inputPerM: .15,
		outputPerM: .6,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/deepseek.js
/**
* DeepSeek V4 peak/off-peak effective time: 2026-08-17 00:00 Beijing
* (= 2026-08-16T16:00Z). Peak hours (Beijing) 09:00–12:00, 14:00–18:00
* = UTC 01:00–04:00 and 06:00–10:00.
*/
const DEEPSEEK_PEAK_OFF_PEAK_FROM = Date.UTC(2026, 7, 16, 16, 0, 0);
const deepseekModels = {
	"deepseek-official/deepseek-v4-flash": {
		inputPerM: 1,
		outputPerM: 2,
		cacheReadPerM: .02,
		peak: {
			inputPerM: 3,
			outputPerM: 9,
			cacheReadPerM: .1
		},
		offPeak: {
			inputPerM: 1.5,
			outputPerM: 4.5,
			cacheReadPerM: .05
		},
		peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
		currency: "CNY",
		source: "bundled"
	},
	"deepseek-official/deepseek-v4-pro": {
		inputPerM: 3,
		outputPerM: 6,
		cacheReadPerM: .025,
		peak: {
			inputPerM: 9,
			outputPerM: 27,
			cacheReadPerM: .3
		},
		offPeak: {
			inputPerM: 4.5,
			outputPerM: 13.5,
			cacheReadPerM: .15
		},
		peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
		currency: "CNY",
		source: "bundled"
	},
	"deepseek-official/deepseek-chat": {
		inputPerM: 1,
		outputPerM: 2,
		cacheReadPerM: .02,
		peak: {
			inputPerM: 3,
			outputPerM: 9,
			cacheReadPerM: .1
		},
		offPeak: {
			inputPerM: 1.5,
			outputPerM: 4.5,
			cacheReadPerM: .05
		},
		peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
		currency: "CNY",
		source: "bundled"
	},
	"deepseek-official/deepseek-reasoner": {
		inputPerM: 3,
		outputPerM: 6,
		cacheReadPerM: .025,
		peak: {
			inputPerM: 9,
			outputPerM: 27,
			cacheReadPerM: .3
		},
		offPeak: {
			inputPerM: 4.5,
			outputPerM: 13.5,
			cacheReadPerM: .15
		},
		peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/doubao.js
const doubaoModels = {
	"doubao/doubao-seed-2.1-pro": {
		inputPerM: 6,
		outputPerM: 30,
		cacheReadPerM: 1.2,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-2.1-turbo": {
		inputPerM: 3,
		outputPerM: 15,
		cacheReadPerM: .6,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-2-0-pro": {
		inputPerM: 3.2,
		outputPerM: 16,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-1.6": {
		inputPerM: .8,
		outputPerM: 2,
		cacheReadPerM: .16,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-1.6-thinking": {
		inputPerM: .8,
		outputPerM: 8,
		cacheReadPerM: .16,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-1.6-vision": {
		inputPerM: .8,
		outputPerM: 8,
		cacheReadPerM: .16,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-1.6-lite": {
		inputPerM: .3,
		outputPerM: .6,
		cacheReadPerM: .06,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-seed-1.6-flash": {
		inputPerM: .15,
		outputPerM: 1.5,
		cacheReadPerM: .03,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-1.5-pro-32k": {
		inputPerM: .8,
		outputPerM: 2,
		cacheReadPerM: .16,
		currency: "CNY",
		source: "bundled"
	},
	"doubao/doubao-1.5-lite-32k": {
		inputPerM: .3,
		outputPerM: .6,
		cacheReadPerM: .06,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/gemini.js
const geminiModels = {
	"gemini/gemini-3.7-flash": {
		inputPerM: .75,
		outputPerM: 3.75,
		cacheReadPerM: .075,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3.6-flash": {
		inputPerM: .75,
		outputPerM: 3.75,
		cacheReadPerM: .075,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3.5-flash": {
		inputPerM: 1.5,
		outputPerM: 9,
		cacheReadPerM: .15,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3.5-flash-lite": {
		inputPerM: .3,
		outputPerM: 2.5,
		cacheReadPerM: .03,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3.1-pro-preview": {
		inputPerM: 2,
		outputPerM: 12,
		cacheReadPerM: .2,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3.1-flash-lite": {
		inputPerM: .25,
		outputPerM: 1.5,
		cacheReadPerM: .025,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-3-flash-preview": {
		inputPerM: .5,
		outputPerM: 3,
		cacheReadPerM: .05,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-2.5-pro": {
		inputPerM: 1.25,
		outputPerM: 10,
		cacheReadPerM: .13,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-2.5-flash": {
		inputPerM: .3,
		outputPerM: 2.5,
		cacheReadPerM: .03,
		currency: "USD",
		source: "bundled"
	},
	"gemini/gemini-2.5-flash-lite": {
		inputPerM: .1,
		outputPerM: .4,
		cacheReadPerM: .01,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/hunyuan.js
const hunyuanModels = {
	"hunyuan/hy3": {
		inputPerM: 1,
		outputPerM: 4,
		cacheReadPerM: .25,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-a13b": {
		inputPerM: .5,
		outputPerM: 2,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-role-latest": {
		inputPerM: 2.4,
		outputPerM: 9.6,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-translation": {
		inputPerM: 1.2,
		outputPerM: 3.6,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-translation-lite": {
		inputPerM: 1,
		outputPerM: 3,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-turbos-vision": {
		inputPerM: 3,
		outputPerM: 9,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-t1-vision": {
		inputPerM: 3,
		outputPerM: 9,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hy-vision-1.5": {
		inputPerM: 3,
		outputPerM: 9,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-turbos-vision-video": {
		inputPerM: 3,
		outputPerM: 9,
		currency: "CNY",
		source: "bundled"
	},
	"hunyuan/hunyuan-embedding": {
		inputPerM: .7,
		outputPerM: .7,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/iflytek.js
const iflytekModels = {
	"iflytek/spark-x1.5": {
		inputPerM: 21,
		outputPerM: 21,
		combinedPerM: 21,
		currency: "CNY",
		source: "bundled"
	},
	"iflytek/spark-ultra": {
		inputPerM: 21,
		outputPerM: 21,
		combinedPerM: 21,
		currency: "CNY",
		source: "bundled"
	},
	"iflytek/spark-pro": {
		inputPerM: 21,
		outputPerM: 21,
		combinedPerM: 21,
		currency: "CNY",
		source: "bundled"
	},
	"iflytek/spark-lite": {
		inputPerM: 0,
		outputPerM: 0,
		combinedPerM: 0,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/minimax.js
const minimaxModels = {
	"minimax/MiniMax-M3": {
		inputPerM: 2.1,
		outputPerM: 8.4,
		cacheReadPerM: .42,
		currency: "CNY",
		source: "bundled"
	},
	"minimax/MiniMax-M2.7": {
		inputPerM: 2.1,
		outputPerM: 8.4,
		cacheReadPerM: .42,
		cacheWritePerM: 2.625,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/mistral.js
const mistralModels = {
	"mistral/mistral-large-latest": {
		inputPerM: .5,
		outputPerM: 1.5,
		cacheReadPerM: .05,
		currency: "USD",
		source: "bundled"
	},
	"mistral/mistral-medium-latest": {
		inputPerM: 1.5,
		outputPerM: 7.5,
		cacheReadPerM: .15,
		currency: "USD",
		source: "bundled"
	},
	"mistral/mistral-small-latest": {
		inputPerM: .15,
		outputPerM: .6,
		cacheReadPerM: .015,
		currency: "USD",
		source: "bundled"
	},
	"mistral/codestral-latest": {
		inputPerM: .3,
		outputPerM: .9,
		cacheReadPerM: .03,
		currency: "USD",
		source: "bundled"
	},
	"mistral/ministral-3-14b": {
		inputPerM: .2,
		outputPerM: .2,
		cacheReadPerM: .02,
		currency: "USD",
		source: "bundled"
	},
	"mistral/ministral-3-8b": {
		inputPerM: .15,
		outputPerM: .15,
		cacheReadPerM: .015,
		currency: "USD",
		source: "bundled"
	},
	"mistral/ministral-3-3b": {
		inputPerM: .1,
		outputPerM: .1,
		cacheReadPerM: .01,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/moonshot.js
const moonshotModels = {
	"moonshot/kimi-k3": {
		inputPerM: 20,
		outputPerM: 100,
		cacheReadPerM: 2,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/kimi-k2.7-code-highspeed": {
		inputPerM: 13,
		outputPerM: 54,
		cacheReadPerM: 2.6,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/kimi-k2.7-code": {
		inputPerM: 6.5,
		outputPerM: 27,
		cacheReadPerM: 1.3,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/kimi-k2.6": {
		inputPerM: 6.5,
		outputPerM: 27,
		cacheReadPerM: 1.1,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/kimi-k2.5": {
		inputPerM: 4,
		outputPerM: 21,
		cacheReadPerM: .7,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/moonshot-v1-8k": {
		inputPerM: 2,
		outputPerM: 10,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/moonshot-v1-32k": {
		inputPerM: 5,
		outputPerM: 20,
		currency: "CNY",
		source: "bundled"
	},
	"moonshot/moonshot-v1-128k": {
		inputPerM: 10,
		outputPerM: 30,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/openai.js
const openaiModels = {
	"openai/gpt-5.5": {
		inputPerM: 5,
		outputPerM: 30,
		cacheReadPerM: .5,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.5-pro": {
		inputPerM: 30,
		outputPerM: 180,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.4": {
		inputPerM: 2.5,
		outputPerM: 15,
		cacheReadPerM: .25,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.4-mini": {
		inputPerM: .75,
		outputPerM: 4.5,
		cacheReadPerM: .075,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.4-nano": {
		inputPerM: .2,
		outputPerM: 1.25,
		cacheReadPerM: .02,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.4-pro": {
		inputPerM: 30,
		outputPerM: 180,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.3-codex": {
		inputPerM: 1.75,
		outputPerM: 14,
		currency: "USD",
		source: "bundled"
	},
	"openai/chat-latest": {
		inputPerM: 5,
		outputPerM: 30,
		cacheReadPerM: .5,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.6-sol": {
		inputPerM: 5,
		outputPerM: 30,
		cacheReadPerM: .5,
		cacheWritePerM: 6.25,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.6-terra": {
		inputPerM: 2,
		outputPerM: 12,
		cacheReadPerM: .2,
		cacheWritePerM: 2.5,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.6-luna": {
		inputPerM: .2,
		outputPerM: 1.2,
		cacheReadPerM: .02,
		cacheWritePerM: .25,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.6-cyber": {
		inputPerM: 12.5,
		outputPerM: 75,
		cacheReadPerM: 1.25,
		cacheWritePerM: 15.625,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5": {
		inputPerM: 1.25,
		outputPerM: 10,
		cacheReadPerM: .125,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.1": {
		inputPerM: 1.25,
		outputPerM: 10,
		cacheReadPerM: .125,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-5.2": {
		inputPerM: 1.75,
		outputPerM: 14,
		cacheReadPerM: .175,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-4o": {
		inputPerM: 2.5,
		outputPerM: 10,
		cacheReadPerM: 1.25,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-4o-mini": {
		inputPerM: .15,
		outputPerM: .6,
		cacheReadPerM: .075,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-4.1": {
		inputPerM: 2,
		outputPerM: 8,
		cacheReadPerM: .5,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-4.1-mini": {
		inputPerM: .4,
		outputPerM: 1.6,
		cacheReadPerM: .1,
		currency: "USD",
		source: "bundled"
	},
	"openai/gpt-4.1-nano": {
		inputPerM: .1,
		outputPerM: .4,
		cacheReadPerM: .025,
		currency: "USD",
		source: "bundled"
	},
	"openai/o3": {
		inputPerM: 2,
		outputPerM: 8,
		cacheReadPerM: .5,
		currency: "USD",
		source: "bundled"
	},
	"openai/o3-mini": {
		inputPerM: 1.1,
		outputPerM: 4.4,
		cacheReadPerM: .55,
		currency: "USD",
		source: "bundled"
	},
	"openai/o4-mini": {
		inputPerM: 1.1,
		outputPerM: 4.4,
		cacheReadPerM: .275,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/qwen.js
const qwenModels = {
	"qwen/qwen3.8-max": {
		inputPerM: 12,
		outputPerM: 36,
		cacheReadPerM: 1.2,
		cacheWritePerM: 15,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen3.8-max-intl": {
		inputPerM: 14.988,
		outputPerM: 44.965,
		cacheReadPerM: 1.4988,
		cacheWritePerM: 18.735,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen3.7-max": {
		inputPerM: 12,
		outputPerM: 36,
		cacheReadPerM: 1.2,
		cacheWritePerM: 15,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen3-max": {
		inputPerM: 2.5,
		outputPerM: 10,
		cacheReadPerM: .25,
		cacheWritePerM: 3.125,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen-max": {
		inputPerM: 2.4,
		outputPerM: 9.6,
		cacheReadPerM: .24,
		cacheWritePerM: 3,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen-plus": {
		inputPerM: .8,
		outputPerM: 2,
		cacheReadPerM: .08,
		cacheWritePerM: 1,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen-flash": {
		inputPerM: .15,
		outputPerM: 1.5,
		cacheReadPerM: .015,
		cacheWritePerM: .1875,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen-turbo": {
		inputPerM: .3,
		outputPerM: .6,
		cacheReadPerM: .03,
		cacheWritePerM: .375,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen-turbo-thinking": {
		inputPerM: .3,
		outputPerM: 3,
		cacheReadPerM: .03,
		cacheWritePerM: .375,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen3-coder-plus": {
		inputPerM: 4,
		outputPerM: 16,
		cacheReadPerM: .4,
		cacheWritePerM: 5,
		currency: "CNY",
		source: "bundled"
	},
	"qwen/qwen3-coder-flash": {
		inputPerM: 1,
		outputPerM: 4,
		cacheReadPerM: .1,
		cacheWritePerM: 1.25,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/skywork.js
const skyworkModels = {
	"skywork/skyclaw-v1.0": {
		inputPerM: .5,
		outputPerM: 4,
		currency: "CNY",
		source: "bundled"
	},
	"skywork/skyclaw-v1.0-lite": {
		inputPerM: .3,
		outputPerM: 2,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/stepfun.js
const stepfunModels = {
	"stepfun/step-3.7-flash": {
		inputPerM: 1.35,
		outputPerM: 8.1,
		cacheReadPerM: .27,
		currency: "CNY",
		source: "bundled"
	},
	"stepfun/step-3.5-flash": {
		inputPerM: .7,
		outputPerM: 2.1,
		cacheReadPerM: .14,
		currency: "CNY",
		source: "bundled"
	},
	"stepfun/step-3.5-flash-2603": {
		inputPerM: .7,
		outputPerM: 2.1,
		cacheReadPerM: .14,
		currency: "CNY",
		source: "bundled"
	},
	"stepfun/step-1o-turbo-vision": {
		inputPerM: 2.5,
		outputPerM: 8,
		cacheReadPerM: .5,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/xai.js
const xaiModels = {
	"xai/grok-4.6": {
		inputPerM: 2,
		outputPerM: 6,
		currency: "USD",
		source: "bundled"
	},
	"xai/grok-4.5": {
		inputPerM: 2,
		outputPerM: 6,
		currency: "USD",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/xiaomi.js
const xiaomiModels = {
	"xiaomi/mimo-v2.5-pro": {
		inputPerM: 3,
		outputPerM: 6,
		cacheReadPerM: .025,
		currency: "CNY",
		source: "bundled"
	},
	"xiaomi/mimo-v2.5": {
		inputPerM: 1,
		outputPerM: 2,
		cacheReadPerM: .02,
		currency: "CNY",
		source: "bundled"
	},
	"xiaomi/mimo-v2-omni": {
		inputPerM: 2.8,
		outputPerM: 14,
		cacheReadPerM: .56,
		currency: "CNY",
		source: "bundled"
	},
	"xiaomi/mimo-v2-flash": {
		inputPerM: .7,
		outputPerM: 2.1,
		cacheReadPerM: .07,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/providers/zhipu.js
const zhipuModels = {
	"zhipu/glm-5.2": {
		inputPerM: 8,
		outputPerM: 28,
		cacheReadPerM: 2,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-5.1": {
		inputPerM: 6,
		outputPerM: 24,
		cacheReadPerM: 1.3,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-5": {
		inputPerM: 4,
		outputPerM: 18,
		cacheReadPerM: 1,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.7": {
		inputPerM: 2,
		outputPerM: 8,
		cacheReadPerM: .4,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.5-air": {
		inputPerM: .8,
		outputPerM: 2,
		cacheReadPerM: .16,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.6v": {
		inputPerM: 1,
		outputPerM: 3,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.6v-flash": {
		inputPerM: 0,
		outputPerM: 0,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.7-flash": {
		inputPerM: 0,
		outputPerM: 0,
		currency: "CNY",
		source: "bundled"
	},
	"zhipu/glm-4.5-flash": {
		inputPerM: 0,
		outputPerM: 0,
		currency: "CNY",
		source: "bundled"
	}
};
//#endregion
//#region lib/types/prices/index.js
/** Map remote-source provider keys onto the harness's provider route ids. */
const PROVIDER_ALIASES = {
	deepseek: "deepseek-official",
	dashscope: "qwen",
	zai: "zhipu",
	"vertex_ai-language-models": "gemini",
	volcengine: "doubao",
	tencent: "hunyuan",
	xfyun: "iflytek"
};
function isPeakHour(utcHour) {
	return utcHour >= 1 && utcHour < 4 || utcHour >= 6 && utcHour < 10;
}
/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable). */
function resolvePricingForTime(pricing, now) {
	if (pricing.peak === void 0 || pricing.offPeak === void 0) return pricing;
	if (pricing.peakOffPeakFrom !== void 0 && now < pricing.peakOffPeakFrom) return pricing;
	const active = isPeakHour(new Date(now).getUTCHours()) ? pricing.peak : pricing.offPeak;
	return {
		...pricing,
		inputPerM: active.inputPerM,
		outputPerM: active.outputPerM,
		...active.cacheReadPerM !== void 0 ? { cacheReadPerM: active.cacheReadPerM } : {}
	};
}
/** Aggregate of every provider's bundled models (snapshot 2026-08-16; sources per provider file). */
const BUNDLED = {
	...deepseekModels,
	...openaiModels,
	...anthropicModels,
	...geminiModels,
	...xaiModels,
	...mistralModels,
	...cohereModels,
	...zhipuModels,
	...moonshotModels,
	...qwenModels,
	...hunyuanModels,
	...doubaoModels,
	...minimaxModels,
	...stepfunModels,
	...iflytekModels,
	...baiduModels,
	...xiaomiModels,
	...baichuanModels,
	...skyworkModels
};
/** The pristine bundled table — the "reset to official defaults" base for user price overrides. */
const BUNDLED_TABLE = BUNDLED;
/**
* A sparse price table keyed by `provider/model`. Lookup tries the exact key,
* then a `*` wildcard for the provider, then returns undefined.
*/
var PriceTable = class {
	rows;
	constructor(rows = {}) {
		this.rows = new Map(Object.entries(rows));
	}
	get(provider, model) {
		return this.rows.get(`${provider}/${model}`) ?? this.rows.get(`${provider}/*`);
	}
	/** Exact-key lookup only (no wildcard) — used for user overrides/reset. */
	getRaw(key) {
		return this.rows.get(key);
	}
	/** Remove one exact row (reset of a user-overridden row with no bundled base). */
	removeRaw(key) {
		this.rows.delete(key);
	}
	/** Merge a full set of rows (remote refresh / user override), keeping others. */
	merge(rows) {
		for (const [key, value] of Object.entries(rows)) this.rows.set(key, value);
	}
	get size() {
		return this.rows.size;
	}
};
/** The process-wide table the projection `view` reads; the service mutates it. */
const currentPrices = {
	table: new PriceTable(BUNDLED),
	currency: "CNY",
	updatedAt: 0,
	usdToCny: 7.2
};
/** Fetch the live USD→CNY exchange rate (free, keyless source). */
async function fetchUsdToCny(signal) {
	const url = "https://open.er-api.com/v6/latest/USD";
	const res = signal === void 0 ? await fetch(url) : await fetch(url, { signal });
	if (!res.ok) throw new Error(`exchange rate HTTP ${res.status}`);
	const rate = (await res.json()).rates?.CNY;
	if (typeof rate !== "number" || rate <= 0) throw new Error("exchange rate: missing CNY rate");
	return rate;
}
/**
* Normalize one LiteLLM `model_prices_and_context_window.json` entry. LiteLLM
* prices in USD; keep USD native so the client converts for display.
*/
function fromLiteLLMEntry(entry) {
	const input = entry.input_cost_per_token;
	const output = entry.output_cost_per_token;
	if (typeof input !== "number" || typeof output !== "number") return null;
	return {
		inputPerM: input * 1e6,
		outputPerM: output * 1e6,
		...typeof entry.cache_read_input_token_cost === "number" ? { cacheReadPerM: entry.cache_read_input_token_cost * 1e6 } : {},
		...typeof entry.cache_creation_input_token_cost === "number" ? { cacheWritePerM: entry.cache_creation_input_token_cost * 1e6 } : {},
		currency: "USD",
		source: "remote"
	};
}
/**
* Fetch and normalize a LiteLLM-shaped pricing document. `litellm_provider`
* is used as the provider route when present (mapped through
* {@link PROVIDER_ALIASES}), else `provider` is synthesized from the model
* id's first segment.
*
* @param url - endpoint serving `model_prices_and_context_window.json`.
* @param signal - caller cancellation.
* @returns a full provider/model price map (empty on failure to avoid clobbering).
*/
async function fetchRemotePrices(url, signal) {
	const res = signal === void 0 ? await fetch(url) : await fetch(url, { signal });
	if (!res.ok) throw new Error(`price source HTTP ${res.status}`);
	const doc = await res.json();
	const rows = {};
	for (const [modelId, raw] of Object.entries(doc)) {
		if (raw === null || typeof raw !== "object") continue;
		const pricing = fromLiteLLMEntry(raw);
		if (pricing === null) continue;
		const rawProvider = raw.litellm_provider ?? modelId.split("/")[0] ?? "";
		const provider = PROVIDER_ALIASES[rawProvider] ?? rawProvider;
		rows[`${provider}/${modelId}`] = pricing;
	}
	return rows;
}
//#endregion
//#region lib/types/balance.js
/**
* DeepSeek account-balance fetch.
*
* The ONLY mainstream provider with a simple public balance endpoint is
* DeepSeek official: `GET https://api.deepseek.com/user/balance` (bearer
* token). Most other providers expose no public balance API (OpenAI removed
* its billing endpoint; Anthropic requires an admin key), so "remaining
* balance" is only available for DeepSeek official — every other route can
* only show a LOCAL estimate (spend vs a user-configured budget), which the
* projection already provides.
*
* The fetch MUST run server-side: the browser cannot hold the API key or
* reach the endpoint (CORS + credential safety). This module is host-only.
*
* @module @deepseek-ai/dsh-usage-meter/balance
*/
/**
* Query DeepSeek's balance endpoint.
* @param apiKey - the user's DeepSeek API key (never logged, never stored by this module).
* @param signal - caller cancellation.
* @returns the raw balance document.
*/
async function fetchDeepSeekBalance(apiKey, signal) {
	const res = signal === void 0 ? await fetch("https://api.deepseek.com/user/balance", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json"
		}
	}) : await fetch("https://api.deepseek.com/user/balance", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: "application/json"
		},
		signal
	});
	if (res.status === 401 || res.status === 403) throw new Error(`DeepSeek balance: HTTP ${res.status} (check the API key)`);
	if (!res.ok) throw new Error(`DeepSeek balance: HTTP ${res.status}`);
	return await res.json();
}
/** Reduce DeepSeek's raw rows into a single preferred snapshot. */
function toSnapshot(raw) {
	if (!raw.is_available || !raw.balance_infos?.length) return null;
	const row = raw.balance_infos[0];
	if (row === void 0) return null;
	return {
		provider: "deepseek-official",
		fetchedAt: Date.now(),
		currency: row.currency,
		totalBalance: Number(row.total_balance) || 0,
		grantedBalance: Number(row.granted_balance) || 0,
		toppedUpBalance: Number(row.topped_up_balance) || 0
	};
}
//#endregion
//#region lib/types/projection.js
/** Bucket-by-bucket cost (each bucket × its own price); 0 while pricing is unknown. */
function costBreakdown(usage, pricing) {
	if (pricing === null) return {
		input: 0,
		cacheRead: 0,
		cacheWrite: 0,
		output: 0,
		total: 0
	};
	const perM = (v) => v / 1e6;
	const discount = pricing.discount ?? 1;
	if (pricing.combinedPerM !== void 0) {
		const total = (usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens) * perM(pricing.combinedPerM) * discount;
		return {
			input: total,
			cacheRead: 0,
			cacheWrite: 0,
			output: 0,
			total
		};
	}
	const input = usage.inputTokens * perM(pricing.inputPerM) * discount;
	const cacheRead = usage.cacheReadTokens * perM(pricing.cacheReadPerM ?? pricing.inputPerM) * discount;
	const cacheWrite = usage.cacheWriteTokens * perM(pricing.cacheWritePerM ?? pricing.inputPerM) * discount;
	const output = usage.outputTokens * perM(pricing.outputPerM) * discount;
	return {
		input,
		cacheRead,
		cacheWrite,
		output,
		total: input + cacheRead + cacheWrite + output
	};
}
/** Cost of one usage sample under a pricing table (0 while pricing is unknown). */
function costOf(usage, pricing) {
	return costBreakdown(usage, pricing).total;
}
//#endregion
//#region lib/types/index.js
/**
* dsh-usage-meter — backend plugin (function plugin: `apply` + `Config`).
*
* Provides:
*   - `ctx.usageMeter` service (price lookup, spend estimation, balance refresh),
*   - a `usage-meter` settings namespace (editable from the web plugin list),
*   - the `usageCost` session projection: per-session requests/tokens/model/pricing/cost,
*     event-folded and replay-aware, served to the browser with zero client math.
*
* Canonical currency is CNY. DeepSeek account balance is fetched from
* `/user/balance` with the same API key the DeepSeek adapter uses
* (`DEEPSEEK_API_KEY`); providers without a balance API fall back to a
* user-set `initialBalance` tracked locally.
*
* @module @deepseek-ai/dsh-usage-meter
*/
const Config = z.object({
	currency: z.string().default("CNY"),
	priceSourceUrl: z.string(),
	refreshIntervalMs: z.number().default(144e5),
	deepseekApiKey: z.string().role("secret"),
	initialBalance: z.number()
});
/** Stable Cordis plugin name. */
const name = "usage-meter";
/** Required services: settings (config namespace), projection registry, webserver (config route). */
const inject = [
	"settings",
	"sessionProjections",
	"webServer"
];
const runtimeConfig = {
	currency: "CNY",
	initialBalance: null
};
/** Latest DeepSeek account-balance snapshot, surfaced through the projection. */
let currentBalance = null;
/**
* True while the currently-active model needs a CNY↔USD conversion (its
* official pricing currency differs from the configured display currency).
* The exchange rate is only fetched/refreshed while this is true.
*/
let rateNeeded = false;
/** Epoch ms of the last successful exchange-rate fetch; 0 = never fetched yet. */
let lastRateFetchedAt = 0;
function configPath() {
	return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "usage-meter.json");
}
const providerConfigs = {};
const balances = {};
/** Per-session last usage sample (turn/step) — used to compute delta deductions. */
const lastUsageBySession = /* @__PURE__ */ new WeakMap();
/** Per-session request (step) start time, mirroring the fold's `stepStart` for the live ledger path. */
const stepStartBySession = /* @__PURE__ */ new WeakMap();
/** Binding key for a (provider, model) pair: official → vendor, custom → model. */
function balanceKeyOf(provider, model) {
	if (provider === null || model === null) return null;
	if (BUNDLED_TABLE[`${provider}/${model}`] !== void 0) return `p:${provider}`;
	return `m:${provider}/${model}`;
}
/** Read (or lazily create) the ledger entry for a key; DeepSeek returns null. */
function ledgerOf(key, defaultCurrency) {
	if (key === null || key.startsWith("p:deepseek")) return null;
	let entry = balances[key];
	if (entry === void 0) entry = balances[key] = {
		balance: 0,
		currency: defaultCurrency
	};
	return entry;
}
/** Broadcast a ledger value to every live session (fold re-emits immediately). */
function broadcastBalance(key, entry, kind) {
	for (const session of activeSessions) appendSessionEvent(session, "usage/balance-ledger", {
		key,
		balance: entry.balance,
		currency: entry.currency,
		kind
	});
}
/** Live sessions seen by this plugin — used to push balance updates immediately. */
const activeSessions = /* @__PURE__ */ new Set();
/**
* Append a log-only event to a session, retrying on the session's "another
* append is being published" reentrancy guard (the listeners are synchronous).
*/
function appendSessionEvent(session, type, data, attempt = 0) {
	try {
		session.append(type, data);
	} catch (err) {
		if (attempt < 4 && /reenter|another append|appending/i.test(String(err))) {
			setTimeout(() => appendSessionEvent(session, type, data, attempt + 1), 0);
			return;
		}
		console.warn("[usage-meter] failed to append session event:", err);
	}
}
const priceOverrides = {};
/** Re-apply every override onto the live price table (after load / edit / reset). */
function applyPriceOverrides() {
	for (const [key, override] of Object.entries(priceOverrides)) {
		if (override.prices === void 0) continue;
		const base = currentPrices.table.getRaw(key) ?? BUNDLED_TABLE[key];
		if (base === void 0) {
			const p = override.prices;
			if (typeof p.inputPerM !== "number" || typeof p.outputPerM !== "number") continue;
			const row = {
				inputPerM: p.inputPerM,
				outputPerM: p.outputPerM,
				...p.cacheReadPerM !== void 0 ? { cacheReadPerM: p.cacheReadPerM } : {},
				...p.cacheWritePerM !== void 0 ? { cacheWritePerM: p.cacheWritePerM } : {},
				...p.combinedPerM !== void 0 ? { combinedPerM: p.combinedPerM } : {},
				...p.discount !== void 0 ? { discount: p.discount } : {},
				...p.peak !== void 0 ? { peak: p.peak } : {},
				...p.offPeak !== void 0 ? { offPeak: p.offPeak } : {},
				...p.currency !== void 0 ? { currency: p.currency } : {},
				source: "user"
			};
			currentPrices.table.merge({ [key]: row });
			continue;
		}
		const row = {
			...base,
			...override.prices,
			currency: override.prices.currency ?? base.currency,
			source: "user"
		};
		currentPrices.table.merge({ [key]: row });
	}
}
/** Derive the default 用量 template from one pricing row (shared by effective + official). */
function rowsFromPricing(base) {
	if (base.combinedPerM !== void 0) return [{
		label: "输入+输出（合并计价）",
		buckets: [
			"input",
			"cacheRead",
			"cacheWrite",
			"output"
		]
	}];
	const rows = [];
	if (base.cacheReadPerM !== void 0) rows.push({
		label: "输入（缓存命中）",
		buckets: ["cacheRead"]
	});
	rows.push({
		label: "输入（缓存未命中）",
		buckets: base.cacheWritePerM === void 0 ? ["input", "cacheWrite"] : ["input"]
	});
	if (base.cacheWritePerM !== void 0) rows.push({
		label: "缓存写入",
		buckets: ["cacheWrite"]
	});
	rows.push({
		label: "输出",
		buckets: ["output"]
	});
	return rows;
}
/** Default 用量 template for a model with no bundled/override pricing (unknown vendor/model). */
function defaultUnknownRows() {
	return [{
		label: "输入（缓存未命中）",
		buckets: ["input", "cacheWrite"]
	}, {
		label: "输出",
		buckets: ["output"]
	}];
}
/** 7 计费方式模板（替代原“厂商模板”下拉，让用户按计费类型选择）。
*  无法自动计量的部分（Gemini 存储费、阶梯更高档）在 note 中注明。 */
const BILLING_TYPES = [
	{
		id: "basic",
		label: "基础计费（输入+输出）",
		rows: [{
			label: "输入",
			buckets: ["input", "cacheWrite"]
		}, {
			label: "输出",
			buckets: ["output"]
		}],
		mode: "split",
		note: "输入与输出分开计价（无缓存机制）。"
	},
	{
		id: "cache-split",
		label: "缓存命中/未命中",
		rows: [
			{
				label: "输入（缓存命中）",
				buckets: ["cacheRead"]
			},
			{
				label: "输入（缓存未命中）",
				buckets: ["input", "cacheWrite"]
			},
			{
				label: "输出",
				buckets: ["output"]
			}
		],
		mode: "split",
		note: "命中按缓存价（约 0.1×输入价），未命中按输入价。"
	},
	{
		id: "peak-off-peak",
		label: "峰谷分时定价 ⚠️DeepSeek",
		rows: [
			{
				label: "输入（缓存命中）",
				buckets: ["cacheRead"]
			},
			{
				label: "输入（缓存未命中）",
				buckets: ["input"]
			},
			{
				label: "输出",
				buckets: ["output"]
			}
		],
		mode: "split",
		peak: true,
		note: "高峰时段（北京时间 9:00-12:00、14:00-18:00）按高峰单价；闲时单价自动 = 高峰 ×0.5（DeepSeek 2026-08-17 起生效）。"
	},
	{
		id: "cache-write",
		label: "缓存写入+命中",
		rows: [
			{
				label: "输入（缓存命中）",
				buckets: ["cacheRead"]
			},
			{
				label: "输入（缓存未命中）",
				buckets: ["input"]
			},
			{
				label: "缓存写入",
				buckets: ["cacheWrite"]
			},
			{
				label: "输出",
				buckets: ["output"]
			}
		],
		mode: "split",
		note: "首次写入约 1.25×输入价、命中约 0.1×输入价（Anthropic 1h 写入为 2×）。"
	},
	{
		id: "cache-storage",
		label: "上下文缓存存储 ⚠️存储费无法计量",
		rows: [
			{
				label: "输入（缓存命中）",
				buckets: ["cacheRead"]
			},
			{
				label: "输入（缓存未命中）",
				buckets: ["input"]
			},
			{
				label: "输出",
				buckets: ["output"]
			}
		],
		mode: "split",
		note: "⚠️ 存储费（存储量×小时）无法自动计量，仅计缓存读价；缓存输入与输出正常计价。"
	},
	{
		id: "tiered",
		label: "上下文长度分档 ⚠️取基础档",
		rows: [{
			label: "输入",
			buckets: ["input", "cacheWrite"]
		}, {
			label: "输出",
			buckets: ["output"]
		}],
		mode: "split",
		note: "⚠️ 取基础档（≤200K 或 ≤32K）；更高档暂按基础档计。"
	},
	{
		id: "combined",
		label: "输入+输出合并",
		rows: [{
			label: "输入+输出（合并计价）",
			buckets: [
				"input",
				"cacheRead",
				"cacheWrite",
				"output"
			]
		}],
		mode: "combined",
		note: "输入+输出按统一单价（讯飞/百川）。"
	},
	{
		id: "batch",
		label: "Batch 半价（×0.5）",
		rows: [],
		mode: "keep",
		discount: .5,
		note: "整单费用 ×0.5（Batch 调用；OpenAI/Anthropic/Gemini/Mistral/Qwen）。"
	}
];
/** The 用量 template for one model: user override, else derived from its base pricing,
*  else the default input/output template (so unknown vendors/models are still
*  editable in the popup — pick a vendor template or fill prices manually). */
function priceRowsOf(provider, model) {
	if (provider === null || model === null) return [];
	const key = `${provider}/${model}`;
	const overridden = priceOverrides[key]?.rows;
	if (overridden !== void 0 && overridden.length > 0) return overridden;
	const base = currentPrices.table.getRaw(key);
	if (base === void 0) return defaultUnknownRows();
	return rowsFromPricing(base);
}
function loadPersistedConfig() {
	try {
		const p = configPath();
		if (!existsSync(p)) return {};
		const doc = JSON.parse(readFileSync(p, "utf8"));
		if (doc.providers) for (const [provider, cfg] of Object.entries(doc.providers)) {
			const pc = {};
			if (cfg.currency !== void 0) pc.currency = cfg.currency;
			providerConfigs[provider] = pc;
			const total = (cfg.initialBalance ?? 0) + (cfg.topUps ?? []).reduce((s, u) => s + u.amount, 0);
			if (provider !== "*" && provider !== "deepseek-official" && (cfg.initialBalance !== void 0 || (cfg.topUps?.length ?? 0) > 0)) balances[`p:${provider}`] = {
				balance: total,
				currency: pc.currency ?? "CNY"
			};
		}
		if (doc.priceOverrides) {
			Object.assign(priceOverrides, doc.priceOverrides);
			applyPriceOverrides();
		}
		if (doc.balances) Object.assign(balances, doc.balances);
		const global = {};
		if (doc.priceSourceUrl !== void 0) global.priceSourceUrl = doc.priceSourceUrl;
		if (doc.refreshIntervalMs !== void 0) global.refreshIntervalMs = doc.refreshIntervalMs;
		if (doc.deepseekApiKey !== void 0) global.deepseekApiKey = doc.deepseekApiKey;
		return global;
	} catch {
		return {};
	}
}
function savePersistedConfig() {
	try {
		writeFileSync(configPath(), JSON.stringify({
			providers: providerConfigs,
			priceOverrides,
			balances
		}, null, 2), "utf8");
	} catch (err) {
		console.warn("[usage-meter] failed to persist config:", err);
	}
}
/** Effective per-provider config; DeepSeek alias maps to canonical, then `*` defaults. */
function getProviderConfig(provider) {
	const key = provider === "deepseek" ? "deepseek-official" : provider;
	if (key !== null && providerConfigs[key] !== void 0) return providerConfigs[key];
	return providerConfigs["*"] ?? {};
}
/** Convert an amount between CNY and USD (display-time only; never feeds computations). */
function toCurrency(amount, from, to, usdToCny) {
	if (from === to) return amount;
	if (from === "USD" && to === "CNY") return amount * usdToCny;
	if (from === "CNY" && to === "USD") return amount / usdToCny;
	return amount;
}
/** True when the route is DeepSeek (alias or canonical id). */
function isDeepSeekProvider(provider) {
	return provider === "deepseek-official" || provider === "deepseek";
}
function bucketsOf(usage) {
	return {
		input: usage.inputTokens,
		output: usage.outputTokens,
		cacheRead: usage.cacheReadTokens ?? 0,
		cacheWrite: usage.cacheWriteTokens ?? 0,
		reasoning: usage.reasoningTokens ?? 0
	};
}
function usageEventOf(event) {
	if (event.type === "assistant/chunk" && event.data.chunk.type === "usage") return {
		turn: event.data.turn,
		step: event.data.step,
		usage: event.data.chunk.usage
	};
	if (event.type === "assistant/message" && event.data.usage !== void 0) return {
		turn: event.data.turn,
		step: event.data.step,
		usage: event.data.usage
	};
	return null;
}
/**
* Resolve the pricing for a route at a given time. The fold passes the
* EVENT's own time so a replayed log reproduces the same per-turn costs
* (peak/off-peak window chosen at the original event time, not at replay
* time — restarting the web server no longer shifts the numbers). The view
* passes no time, i.e. resolves at "now" for the current-rate display.
*/
function pricingFor(provider, model, at) {
	if (provider === null || model === null) return null;
	const raw = currentPrices.table.get(provider, model);
	if (raw === void 0) return null;
	const resolved = resolvePricingForTime(raw, at ?? Date.now());
	const updatedAt = currentPrices.updatedAt > 0 ? currentPrices.updatedAt : resolved.updatedAt;
	return {
		...resolved,
		...updatedAt === void 0 ? {} : { updatedAt }
	};
}
const peakRatesSchema = z$1.object({
	inputPerM: z$1.number(),
	outputPerM: z$1.number(),
	cacheReadPerM: z$1.number().optional()
}).strict();
const pricingSchema = z$1.object({
	inputPerM: z$1.number(),
	outputPerM: z$1.number(),
	cacheReadPerM: z$1.number().optional(),
	cacheWritePerM: z$1.number().optional(),
	combinedPerM: z$1.number().optional(),
	discount: z$1.number().optional(),
	currency: z$1.string().optional(),
	updatedAt: z$1.number().optional(),
	source: z$1.enum([
		"bundled",
		"remote",
		"user"
	]).optional(),
	peak: peakRatesSchema.optional(),
	offPeak: peakRatesSchema.optional(),
	peakOffPeakFrom: z$1.number().optional()
}).strict();
const turnCostSchema = z$1.object({
	turn: z$1.number().int().nonnegative(),
	cost: z$1.number(),
	currency: z$1.string(),
	model: z$1.string().nullable(),
	startedAt: z$1.number(),
	endedAt: z$1.number(),
	endReason: z$1.string().nullable(),
	inputTokens: z$1.number().int().nonnegative(),
	outputTokens: z$1.number().int().nonnegative(),
	cacheReadTokens: z$1.number().int().nonnegative(),
	cacheWriteTokens: z$1.number().int().nonnegative(),
	reasoningTokens: z$1.number().int().nonnegative()
}).strict();
const accountBalanceSchema = z$1.object({
	currency: z$1.string(),
	totalBalance: z$1.number(),
	updatedAt: z$1.number(),
	source: z$1.enum(["api", "computed"])
}).strict();
const usageCostSchema = z$1.object({
	requestCount: z$1.number().int().nonnegative(),
	stepCount: z$1.number().int().nonnegative(),
	inputTokens: z$1.number().int().nonnegative(),
	outputTokens: z$1.number().int().nonnegative(),
	cacheReadTokens: z$1.number().int().nonnegative(),
	cacheWriteTokens: z$1.number().int().nonnegative(),
	reasoningTokens: z$1.number().int().nonnegative(),
	provider: z$1.string().nullable(),
	model: z$1.string().nullable(),
	pricing: pricingSchema.nullable(),
	basePricing: pricingSchema.nullable(),
	priceRows: z$1.array(z$1.object({
		label: z$1.string(),
		buckets: z$1.array(z$1.enum([
			"input",
			"cacheRead",
			"cacheWrite",
			"output"
		]))
	}).strict()),
	officialPrice: z$1.object({
		pricing: pricingSchema,
		rows: z$1.array(z$1.object({
			label: z$1.string(),
			buckets: z$1.array(z$1.enum([
				"input",
				"cacheRead",
				"cacheWrite",
				"output"
			]))
		}).strict())
	}).nullable(),
	estimatedCost: z$1.number(),
	currency: z$1.string(),
	usdToCny: z$1.number(),
	rateUpdatedAt: z$1.number(),
	accountBalance: accountBalanceSchema.nullable(),
	turns: z$1.array(turnCostSchema)
}).strict();
function addToLastTurn(turns, delta, deltaCost, currency) {
	const last = turns[turns.length - 1];
	if (last === void 0) return turns;
	const next = [...turns];
	next[next.length - 1] = {
		turn: last.turn,
		cost: last.cost + deltaCost,
		currency,
		model: last.model,
		startedAt: last.startedAt,
		endedAt: last.endedAt,
		endReason: last.endReason,
		input: last.input + delta.input,
		output: last.output + delta.output,
		cacheRead: last.cacheRead + delta.cacheRead,
		cacheWrite: last.cacheWrite + delta.cacheWrite,
		reasoning: last.reasoning + delta.reasoning
	};
	return next;
}
const usageCostProjection = {
	key: "usageCost",
	schema: usageCostSchema,
	init() {
		return {
			requestCount: 0,
			stepCount: 0,
			inputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			reasoningTokens: 0,
			provider: null,
			model: null,
			stepStart: null,
			anchor: null,
			manualAnchor: null,
			lastCostAt: 0,
			turns: [],
			last: null
		};
	},
	apply(state, event) {
		let next = state;
		if (event.type === "request/header") {
			const { provider, model } = event.data.header.config;
			if (provider !== state.provider || model !== state.model) {
				next = {
					...next,
					provider,
					model
				};
				const open = next.turns[next.turns.length - 1];
				if (open !== void 0 && open.endedAt === 0 && open.model !== model) {
					const turns = [...next.turns];
					turns[turns.length - 1] = {
						...open,
						model
					};
					next = {
						...next,
						turns
					};
				}
				if (isDeepSeekProvider(provider) && state.manualAnchor !== null) next = {
					...next,
					manualAnchor: null
				};
				if (!isDeepSeekProvider(provider) && state.anchor !== null) next = {
					...next,
					anchor: null
				};
			}
		}
		if (event.type === "turn/start") {
			const turn = event.data.turn;
			const last = next.turns[next.turns.length - 1];
			if (last === void 0 || last.turn !== turn) next = {
				...next,
				turns: [...next.turns, {
					turn,
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					reasoning: 0,
					cost: 0,
					currency: "CNY",
					model: state.model,
					startedAt: event.time,
					endedAt: 0,
					endReason: null
				}]
			};
		}
		if (event.type === "turn/end") {
			const last = next.turns[next.turns.length - 1];
			if (last !== void 0 && last.turn === event.data.turn && last.endedAt === 0) {
				const turns = [...next.turns];
				turns[turns.length - 1] = {
					...last,
					endedAt: event.time,
					endReason: String(event.data.reason.kind ?? "completed")
				};
				next = {
					...next,
					turns
				};
			}
		}
		if (event.type === "step/start") next = {
			...next,
			stepCount: state.stepCount + 1,
			stepStart: {
				turn: event.data.turn,
				step: event.data.step,
				at: event.time
			}
		};
		if (event.type === "assistant/message") next = {
			...next,
			requestCount: state.requestCount + 1
		};
		if (event.type === "usage/balance" && isDeepSeekProvider(state.provider)) {
			const bal = event.data.balance;
			if (bal === null) {
				if (state.anchor !== null) next = {
					...next,
					anchor: null
				};
			} else if (state.anchor === null || state.anchor.totalBalance !== bal.totalBalance || state.anchor.fetchedAt !== bal.updatedAt) {
				const costTotal = state.turns.reduce((sum, t) => sum + t.cost, 0);
				next = {
					...next,
					anchor: {
						currency: bal.currency,
						totalBalance: bal.totalBalance,
						fetchedAt: bal.updatedAt,
						costBaseline: costTotal
					}
				};
			}
		}
		if (event.type === "usage/balance-ledger" && !isDeepSeekProvider(state.provider)) {
			const lb = event.data;
			const key = balanceKeyOf(state.provider, state.model);
			if (key !== null && lb.key === key) {
				if (state.manualAnchor === null || state.manualAnchor.totalBalance !== lb.balance || state.manualAnchor.currency !== lb.currency) next = {
					...next,
					manualAnchor: {
						currency: lb.currency,
						totalBalance: lb.balance,
						at: event.time,
						kind: lb.kind
					}
				};
			}
		}
		const ue = usageEventOf(event);
		if (ue !== null) {
			const prev = state.last !== null && state.last.turn === ue.turn && state.last.step === ue.step ? state.last : null;
			const b = bucketsOf(ue.usage);
			if (!(prev !== null && prev.input === b.input && prev.output === b.output && prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning)) {
				const delta = {
					input: b.input - (prev?.input ?? 0),
					output: b.output - (prev?.output ?? 0),
					cacheRead: b.cacheRead - (prev?.cacheRead ?? 0),
					cacheWrite: b.cacheWrite - (prev?.cacheWrite ?? 0),
					reasoning: b.reasoning - (prev?.reasoning ?? 0)
				};
				const requestStart = state.stepStart !== null && state.stepStart.turn === ue.turn && state.stepStart.step === ue.step ? state.stepStart.at : state.turns[state.turns.length - 1]?.startedAt ?? event.time;
				const pricing = pricingFor(state.provider, state.model, requestStart);
				const deltaCost = pricing === null ? 0 : costOf({
					inputTokens: delta.input,
					outputTokens: delta.output,
					cacheReadTokens: delta.cacheRead,
					cacheWriteTokens: delta.cacheWrite
				}, pricing);
				next = {
					...next,
					inputTokens: state.inputTokens + delta.input,
					outputTokens: state.outputTokens + delta.output,
					cacheReadTokens: state.cacheReadTokens + delta.cacheRead,
					cacheWriteTokens: state.cacheWriteTokens + delta.cacheWrite,
					reasoningTokens: state.reasoningTokens + delta.reasoning,
					lastCostAt: event.time,
					turns: addToLastTurn(next.turns, delta, deltaCost, pricing?.currency ?? "CNY"),
					last: {
						turn: ue.turn,
						step: ue.step,
						...b
					}
				};
			}
		}
		return next === state ? state : next;
	},
	view(state) {
		const pricing = pricingFor(state.provider, state.model);
		const estimatedCost = state.turns.reduce((sum, t) => sum + t.cost, 0);
		const pc = getProviderConfig(state.provider);
		const turns = state.turns.map((t) => ({
			turn: t.turn,
			cost: t.cost,
			currency: t.currency,
			model: t.model,
			startedAt: t.startedAt,
			endedAt: t.endedAt,
			endReason: t.endReason,
			inputTokens: t.input,
			outputTokens: t.output,
			cacheReadTokens: t.cacheRead,
			cacheWriteTokens: t.cacheWrite,
			reasoningTokens: t.reasoning
		}));
		let accountBalance = null;
		if (isDeepSeekProvider(state.provider)) {
			if (state.anchor !== null) {
				const delta = estimatedCost - state.anchor.costBaseline;
				if (delta <= 0) accountBalance = {
					currency: state.anchor.currency,
					totalBalance: state.anchor.totalBalance,
					updatedAt: state.anchor.fetchedAt,
					source: "api"
				};
				else accountBalance = {
					currency: state.anchor.currency,
					totalBalance: Math.max(state.anchor.totalBalance - delta, 0),
					updatedAt: state.lastCostAt,
					source: "computed"
				};
			}
		} else {
			const key = balanceKeyOf(state.provider, state.model);
			const ledger = key !== null ? balances[key] : void 0;
			const manual = state.manualAnchor ?? (ledger !== void 0 ? {
				currency: ledger.currency,
				totalBalance: ledger.balance,
				at: 0,
				kind: "manual"
			} : null);
			if (manual !== null) accountBalance = {
				currency: manual.currency,
				totalBalance: manual.totalBalance,
				updatedAt: state.lastCostAt > manual.at ? state.lastCostAt : manual.at,
				source: state.lastCostAt > manual.at ? "computed" : manual.kind === "manual" ? "api" : "computed"
			};
		}
		const officialKey = state.provider !== null && state.model !== null ? `${state.provider}/${state.model}` : null;
		const officialRow = officialKey !== null ? BUNDLED_TABLE[officialKey] : void 0;
		const officialPrice = officialRow === void 0 ? null : {
			pricing: officialRow,
			rows: rowsFromPricing(officialRow)
		};
		return {
			requestCount: state.requestCount,
			stepCount: state.stepCount,
			inputTokens: state.inputTokens,
			outputTokens: state.outputTokens,
			cacheReadTokens: state.cacheReadTokens,
			cacheWriteTokens: state.cacheWriteTokens,
			reasoningTokens: state.reasoningTokens,
			provider: state.provider,
			model: state.model,
			pricing,
			basePricing: currentPrices.table.get(state.provider ?? "", state.model ?? "") ?? null,
			priceRows: priceRowsOf(state.provider, state.model),
			officialPrice,
			estimatedCost,
			currency: pc.currency ?? runtimeConfig.currency,
			usdToCny: currentPrices.usdToCny,
			rateUpdatedAt: lastRateFetchedAt,
			accountBalance,
			turns
		};
	},
	stateVersion: 15
};
var UsageMeterCore = class {
	cfg;
	priceRefreshing = null;
	balanceRefreshing = null;
	rateRefreshing = null;
	lastRateRefresh = 0;
	constructor(config) {
		this.cfg = config;
	}
	getConfig() {
		return this.cfg;
	}
	applyConfig(cfg) {
		this.cfg = cfg;
		runtimeConfig.currency = cfg.currency ?? "CNY";
		runtimeConfig.initialBalance = cfg.initialBalance !== void 0 && cfg.initialBalance > 0 ? cfg.initialBalance : null;
	}
	getPrice(provider, model) {
		return currentPrices.table.get(provider, model);
	}
	estimateCost(usage, provider, model) {
		return costOf(usage, this.getPrice(provider, model) ?? null);
	}
	getBalance() {
		return currentBalance;
	}
	maybeRefresh() {
		const ms = this.cfg.refreshIntervalMs ?? 144e5;
		const now = Date.now();
		if (rateNeeded && now - this.lastRateRefresh >= ms) {
			this.lastRateRefresh = now;
			this.refreshRate();
		}
		if (now - currentPrices.updatedAt >= ms) this.refreshPrices();
		if (currentBalance === null || now - currentBalance.fetchedAt >= ms) this.refreshBalance();
	}
	async refreshRate() {
		if (this.rateRefreshing) return this.rateRefreshing;
		this.rateRefreshing = (async () => {
			try {
				currentPrices.usdToCny = await fetchUsdToCny();
				lastRateFetchedAt = Date.now();
				console.info(`[usage-meter] exchange rate updated: 1 USD = ${currentPrices.usdToCny} CNY`);
			} catch (err) {
				console.warn(`[usage-meter] exchange rate refresh failed (keeping last): ${String(err)}`);
			} finally {
				this.rateRefreshing = null;
			}
		})();
		return this.rateRefreshing;
	}
	async refreshPrices() {
		const url = this.cfg.priceSourceUrl;
		if (!url) return;
		if (this.priceRefreshing) return this.priceRefreshing;
		this.priceRefreshing = (async () => {
			try {
				const rows = await fetchRemotePrices(url);
				currentPrices.table.merge(rows);
				currentPrices.updatedAt = Date.now();
				console.info(`[usage-meter] refreshed ${Object.keys(rows).length} price rows`);
			} catch (err) {
				console.warn(`[usage-meter] price refresh failed (keeping last table): ${String(err)}`);
			} finally {
				this.priceRefreshing = null;
			}
		})();
		return this.priceRefreshing;
	}
	async refreshBalance() {
		const envKey = globalThis.process?.env?.DEEPSEEK_API_KEY;
		const apiKey = this.cfg.deepseekApiKey ?? envKey;
		if (!apiKey) {
			currentBalance = null;
			return;
		}
		if (this.balanceRefreshing) return this.balanceRefreshing;
		this.balanceRefreshing = (async () => {
			try {
				currentBalance = toSnapshot(await fetchDeepSeekBalance(apiKey));
			} catch (err) {
				console.warn(`[usage-meter] balance refresh failed: ${String(err)}`);
			} finally {
				this.balanceRefreshing = null;
			}
		})();
		return this.balanceRefreshing;
	}
};
/** Plugin entry: provide the service, register settings + the projection. */
function apply(ctx, config = {}) {
	const effectiveConfig = {
		...config,
		...loadPersistedConfig()
	};
	const meter = new UsageMeterCore(effectiveConfig);
	meter.applyConfig(effectiveConfig);
	const scope = ctx.settings.register(settingsNamespace("usage-meter"), Config, { base: config });
	meter.applyConfig(scope.get());
	scope.watch((next) => meter.applyConfig(next));
	ctx.sessionProjections.register(usageCostProjection);
	ctx.webServer.register({
		kind: "exact",
		path: "/api/usage-meter/templates",
		handler: async (_req, res) => {
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({
				ok: true,
				types: BILLING_TYPES
			}));
		}
	});
	ctx.webServer.register({
		kind: "exact",
		path: "/api/usage-meter/refresh-rate",
		handler: async (_req, res) => {
			await meter.refreshRate();
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({
				ok: true,
				usdToCny: currentPrices.usdToCny,
				rateUpdatedAt: lastRateFetchedAt
			}));
		}
	});
	ctx.webServer.register({
		kind: "exact",
		path: "/api/usage-meter/config",
		handler: async (req, res) => {
			if (req.method === "GET") {
				const cfg = meter.getConfig();
				const safe = {
					...cfg,
					deepseekApiKey: cfg.deepseekApiKey ? "***" : void 0
				};
				res.writeHead(200, { "content-type": "application/json" });
				res.end(JSON.stringify({
					ok: true,
					config: safe,
					providers: providerConfigs,
					priceOverrides,
					balances
				}));
				return;
			}
			if (req.method === "POST") {
				let body = "";
				for await (const chunk of req) body += String(chunk);
				const patch = JSON.parse(body);
				const merged = { ...meter.getConfig() };
				if (patch.priceSourceUrl !== void 0) merged.priceSourceUrl = patch.priceSourceUrl;
				if (patch.refreshIntervalMs !== void 0) merged.refreshIntervalMs = patch.refreshIntervalMs;
				if (patch.deepseekApiKey !== void 0 && patch.deepseekApiKey !== "***") merged.deepseekApiKey = patch.deepseekApiKey;
				meter.applyConfig(merged);
				let currencyChanged = false;
				let ledgerChanged = false;
				let ledgerKey = null;
				let ledgerEntry = null;
				if (patch.provider !== void 0 && patch.provider !== null) {
					const pc = providerConfigs[patch.provider] ?? (providerConfigs[patch.provider] = {});
					if (patch.currency !== void 0 && patch.currency !== pc.currency) {
						pc.currency = patch.currency;
						currencyChanged = true;
					}
					if (!isDeepSeekProvider(patch.provider)) {
						ledgerKey = balanceKeyOf(patch.provider, patch.model ?? null);
						ledgerEntry = ledgerOf(ledgerKey, pc.currency ?? runtimeConfig.currency);
						if (ledgerKey !== null && ledgerEntry !== null) {
							if (patch.balance !== void 0 && Number.isFinite(patch.balance)) {
								ledgerEntry.balance = patch.balance;
								ledgerChanged = true;
							}
							if (patch.recharge !== void 0 && Number.isFinite(patch.recharge) && patch.recharge !== 0) {
								ledgerEntry.balance = ledgerEntry.balance + patch.recharge;
								ledgerChanged = true;
							}
							if (patch.currency !== void 0 && patch.currency !== ledgerEntry.currency) {
								if (patch.balance === void 0) {
									if (lastRateFetchedAt === 0) await meter.refreshRate();
									const newCurrency = patch.currency;
									ledgerEntry.balance = toCurrency(ledgerEntry.balance, ledgerEntry.currency, newCurrency, currentPrices.usdToCny);
								}
								ledgerEntry.currency = patch.currency;
								ledgerChanged = true;
							}
						}
					}
					savePersistedConfig();
				}
				if (currencyChanged) {
					rateNeeded = true;
					meter.refreshRate();
				}
				if (ledgerChanged && ledgerKey !== null && ledgerEntry !== null) broadcastBalance(ledgerKey, ledgerEntry, "manual");
				if (patch.model !== void 0 && patch.model !== null && patch.provider !== void 0 && patch.provider !== null) {
					const key = `${patch.provider}/${patch.model}`;
					const override = patch;
					if (override.reset === true) {
						delete priceOverrides[key];
						if (BUNDLED_TABLE[key] !== void 0) currentPrices.table.merge({ [key]: BUNDLED_TABLE[key] });
						else currentPrices.table.removeRaw(key);
					} else {
						const next = { ...priceOverrides[key] };
						if (override.prices !== void 0) next.prices = { ...override.prices };
						if (override.rows !== void 0) next.rows = [...override.rows];
						priceOverrides[key] = next;
						applyPriceOverrides();
					}
					savePersistedConfig();
				}
				res.writeHead(200, { "content-type": "application/json" });
				res.end(JSON.stringify({ ok: true }));
				return;
			}
			res.writeHead(405);
			res.end();
		}
	});
	console.log("[usage-meter] config route registered at /api/usage-meter/config");
	currentPrices.updatedAt = Date.now();
	ctx.effect(() => {
		const ms = meter.getConfig().refreshIntervalMs ?? 144e5;
		const timer = setInterval(() => meter.maybeRefresh(), ms);
		return () => clearInterval(timer);
	});
	ctx.on("session/event", (session, event) => {
		activeSessions.add(session);
		let provider = null;
		let model = null;
		try {
			const v = ctx.sessionProjections.snapshot(session).values["usageCost"];
			provider = v?.provider ?? null;
			model = v?.model ?? null;
			const pc = v?.pricing?.currency;
			rateNeeded = pc !== void 0 && pc !== null && pc !== v?.currency;
		} catch {}
		if (event.type === "turn/start") meter.refreshBalance().then(() => {
			const b = meter.getBalance();
			appendSessionEvent(session, "usage/balance", { balance: b === null ? null : {
				currency: b.currency,
				totalBalance: b.totalBalance,
				updatedAt: b.fetchedAt,
				source: "api"
			} });
		});
		if (event.type === "step/start") stepStartBySession.set(session, {
			turn: event.data.turn,
			step: event.data.step,
			at: event.time
		});
		if (!isDeepSeekProvider(provider)) {
			const ue = usageEventOf(event);
			if (ue !== null) {
				const b = bucketsOf(ue.usage);
				const prev = lastUsageBySession.get(session);
				if (!(prev !== void 0 && prev.turn === ue.turn && prev.step === ue.step && prev.input === b.input && prev.output === b.output && prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning)) {
					const p = prev !== void 0 && prev.turn === ue.turn && prev.step === ue.step ? prev : void 0;
					const delta = {
						input: b.input - (p?.input ?? 0),
						output: b.output - (p?.output ?? 0),
						cacheRead: b.cacheRead - (p?.cacheRead ?? 0),
						cacheWrite: b.cacheWrite - (p?.cacheWrite ?? 0),
						reasoning: b.reasoning - (p?.reasoning ?? 0)
					};
					lastUsageBySession.set(session, {
						turn: ue.turn,
						step: ue.step,
						...b
					});
					const ss = stepStartBySession.get(session);
					const requestStart = ss !== void 0 && ss.turn === ue.turn && ss.step === ue.step ? ss.at : event.time;
					const pricing = pricingFor(provider, model, requestStart);
					if (pricing !== null) {
						const key = balanceKeyOf(provider, model);
						const ledger = ledgerOf(key, getProviderConfig(provider).currency ?? runtimeConfig.currency);
						if (key !== null && ledger !== null) {
							const costInLedger = toCurrency(costOf({
								inputTokens: delta.input,
								outputTokens: delta.output,
								cacheReadTokens: delta.cacheRead,
								cacheWriteTokens: delta.cacheWrite
							}, pricing), pricing.currency ?? "CNY", ledger.currency, currentPrices.usdToCny);
							ledger.balance = ledger.balance - costInLedger;
							savePersistedConfig();
							broadcastBalance(key, ledger, "deduct");
						}
					}
				}
			}
		}
		meter.maybeRefresh();
	});
	meter.maybeRefresh();
}
//#endregion
export { BILLING_TYPES, Config, apply, costBreakdown, costOf, inject, name, usageCostProjection };
