import { z } from "zod";
import { saveSegmentationAnalysis } from "../db";
import { runSegmentation } from "../segmentation";
import { publicProcedure, router } from "../_core/trpc";

export const segmentationRouter = router({
  analyze: publicProcedure
    .input(z.object({ filename: z.string().min(1).max(128), dataUrl: z.string().min(32).max(12_000_000) }))
    .mutation(async ({ input, ctx }) => {
      const result = await runSegmentation(input.dataUrl, input.filename);
      await saveSegmentationAnalysis({
        analysisId: result.analysisId,
        userOpenId: ctx.user?.openId ?? null,
        sourceUrl: result.sourceUrl,
        predictionUrl: result.predictionUrl,
        overlayUrl: result.overlayUrl,
        modelVersion: result.model.version,
        metricsJson: JSON.stringify({ classCounts: result.classCounts, width: result.width, height: result.height, cv: result.cv }),
      });
      return result;
    }),
});
