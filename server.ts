import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.8-flash' });
  });

  // AI Workout & Nutrition Plan Generation Endpoint
  app.post('/api/ai/generate-plan', async (req, res) => {
    try {
      const {
        planType = 'workout',
        profile,
        goal = 'recomp',
        customNotes = '',
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const ai = getGenAIClient();

      const athleteName = profile?.name || 'المشترك';
      const weight = profile?.weight ?? 75;
      const height = profile?.height ?? 175;
      const muscleMass = profile?.muscleMass ?? 33;
      const bodyFat = profile?.bodyFat ?? 20;
      const targetWeight = profile?.targetWeight ?? 70;
      const currentCalories = profile?.dailyCalories ?? 2100;

      const goalLabels: Record<string, string> = {
        hypertrophy: 'بناء كتلة عضلية صافية (Clean Hypertrophy & Muscle Gain)',
        cutting: 'تنشيف وحرق الدهون مع الحفاظ على العضل (Fat Loss & Cutting)',
        recomp: 'إعادة تشكيل الجسم وبناء العضل مع خفض الدهون (Body Recomposition)',
        strength: 'تطوير القوة القصوى والأداء الرياضي (Strength & Power)',
      };
      const selectedGoalDesc = goalLabels[goal] || goalLabels.recomp;

      const modelName = 'gemini-3.8-flash';

      if (planType === 'nutrition') {
        const promptInput = [
          `تصميم برنامج غذائي وماكروز احترافي للمشترك: ${athleteName}`,
          `القياسات الحيوية: الوزن ${weight} كجم، الطول ${height} سم، الكتلة العضلية ${muscleMass} كجم، نسبة الدهون ${bodyFat}%، الوزن المستهدف ${targetWeight} كجم، السعرات الحالية ${currentCalories} سعرة.`,
          `الهدف التدريبي: ${selectedGoalDesc}.`,
          customNotes ? `ملاحظات وتفضيلات إضافية: ${customNotes}` : '',
          `يرجى توليد خطة غذائية يومية متكاملة من 4 وجبات محسوبة السعرات والماكروز بدقة باللغتين العربية والإنجليزية مع توصيات الاستشفاء وشرب الماء.`,
        ]
          .filter(Boolean)
          .join('\n');

        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptInput,
          config: {
            systemInstruction:
              'أنت خبير تغذية رياضية ومدرب محترف في منظومة OAO (Own Aura Outcome) بإشراف الكوتش عمر عدنان. صمم خططاً غذائية علمية دقيقة وعملية محسوبة الماكروز والسعرات تناسب قياسات المشترك وهدفه.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleAr: { type: Type.STRING },
                titleEn: { type: Type.STRING },
                summaryAr: { type: Type.STRING },
                summaryEn: { type: Type.STRING },
                recommendationsAr: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendationsEn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nutritionPlan: {
                  type: Type.OBJECT,
                  properties: {
                    dailyCalories: { type: Type.INTEGER },
                    protein: { type: Type.INTEGER },
                    carbs: { type: Type.INTEGER },
                    fats: { type: Type.INTEGER },
                    waterLiters: { type: Type.NUMBER },
                    meals: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          mealNameAr: { type: Type.STRING },
                          mealNameEn: { type: Type.STRING },
                          timingAr: { type: Type.STRING },
                          timingEn: { type: Type.STRING },
                          calories: { type: Type.INTEGER },
                          protein: { type: Type.INTEGER },
                          carbs: { type: Type.INTEGER },
                          fats: { type: Type.INTEGER },
                          itemsAr: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          itemsEn: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                        required: [
                          'mealNameAr',
                          'mealNameEn',
                          'timingAr',
                          'timingEn',
                          'calories',
                          'protein',
                          'carbs',
                          'fats',
                          'itemsAr',
                          'itemsEn',
                        ],
                      },
                    },
                  },
                  required: [
                    'dailyCalories',
                    'protein',
                    'carbs',
                    'fats',
                    'waterLiters',
                    'meals',
                  ],
                },
              },
              required: [
                'titleAr',
                'titleEn',
                'summaryAr',
                'summaryEn',
                'recommendationsAr',
                'recommendationsEn',
                'nutritionPlan',
              ],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
        const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
        const totalTokens =
          response.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

        res.json({
          plan: {
            ...parsed,
            planType: 'nutrition',
            modelName,
            promptInput,
            promptTokens,
            completionTokens,
            totalTokens,
          },
        });
        return;
      }

      // Default: Workout Plan Generation
      const promptInput = [
        `تصميم برنامج تدريبي احترافي مخصص للمشترك: ${athleteName}`,
        `القياسات الحيوية: الوزن ${weight} كجم، الطول ${height} سم، الكتلة العضلية ${muscleMass} كجم، نسبة الدهون ${bodyFat}%، الوزن المستهدف ${targetWeight} كجم.`,
        `الهدف التدريبي: ${selectedGoalDesc}.`,
        customNotes ? `ملاحظات وإصابات أو تفضيلات: ${customNotes}` : '',
        `قم ببناء جدول تدريبي علمي مقسم إلى 4 أيام أساسية (push, pull, legs, upper) مع 4 تمارين دقيقة لكل يوم تشمل الجلسات والتكرارات والأوزان المقترحة وفترات الراحة ونصائح الأداء باللغتين العربية والإنجليزية.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptInput,
        config: {
          systemInstruction:
            'أنت كبير مدربي القوة والتحول البدني في منظومة OAO (Own Aura Outcome) بإشراف الكوتش عمر عدنان. صمم جداول تدريبية احترافية مبنية على أسس الميكانيكا الحيوية والزيادة التدريجية للأحمال (Progressive Overload). التزم بمفاتيح الأيام: push و pull و legs و upper.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titleAr: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              summaryAr: { type: Type.STRING },
              summaryEn: { type: Type.STRING },
              recommendationsAr: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendationsEn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              workoutDays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      description: 'Must be one of: push, pull, legs, upper',
                    },
                    titleAr: { type: Type.STRING },
                    titleEn: { type: Type.STRING },
                    subtitleAr: { type: Type.STRING },
                    subtitleEn: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nameAr: { type: Type.STRING },
                          nameEn: { type: Type.STRING },
                          targetMuscleAr: { type: Type.STRING },
                          targetMuscleEn: { type: Type.STRING },
                          setsCount: { type: Type.INTEGER },
                          repsRange: { type: Type.STRING },
                          targetWeightKg: { type: Type.NUMBER },
                          restSeconds: { type: Type.INTEGER },
                          tipAr: { type: Type.STRING },
                          tipEn: { type: Type.STRING },
                        },
                        required: [
                          'nameAr',
                          'nameEn',
                          'targetMuscleAr',
                          'targetMuscleEn',
                          'setsCount',
                          'repsRange',
                          'targetWeightKg',
                          'restSeconds',
                          'tipAr',
                          'tipEn',
                        ],
                      },
                    },
                  },
                  required: ['key', 'titleAr', 'titleEn', 'subtitleAr', 'subtitleEn', 'exercises'],
                },
              },
            },
            required: [
              'titleAr',
              'titleEn',
              'summaryAr',
              'summaryEn',
              'recommendationsAr',
              'recommendationsEn',
              'workoutDays',
            ],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens =
        response.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

      res.json({
        plan: {
          ...parsed,
          planType: 'workout',
          modelName,
          promptInput,
          promptTokens,
          completionTokens,
          totalTokens,
        },
      });
    } catch (err) {
      console.error('Gemini Plan Generation Error:', err);
      const message =
        err instanceof Error ? err.message : 'حدث خطأ أثناء توليد البرنامج بالذكاء الاصطناعي';
      res.status(500).json({ error: message });
    }
  });

  // Mount Vite middleware in development or serve built static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OAO Training Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
