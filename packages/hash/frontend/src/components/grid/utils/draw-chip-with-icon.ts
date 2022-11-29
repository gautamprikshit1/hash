import { CustomCell } from "@glideapps/glide-data-grid";
import type { DrawArgs } from "@glideapps/glide-data-grid/dist/ts/data-grid/cells/cell-types";
import { getYCenter } from "../utils";
import { drawRoundRect } from "./draw-round-rect";

/**
 * @param args draw args of cell
 * @param text text content of chip
 * @param left left position of chip
 * @param textColor text color
 * @param bgColor background color
 * @returns width of the drawn chip
 */
export const drawChipWithIcon = (
  args: DrawArgs<CustomCell>,
  text: string,
  left: number,
  textColor?: string,
  bgColor?: string,
) => {
  const { ctx, theme } = args;
  const yCenter = getYCenter(args);

  const height = 26;
  const chipTop = yCenter - height / 2;
  const paddingX = 12;
  const iconSize = 10;
  const gap = 6;

  const iconLeft = left + paddingX;
  const textLeft = iconSize + gap + iconLeft;

  const textWidth = ctx.measureText(text).width;
  const chipWidth = iconSize + gap + textWidth + 2 * paddingX;

  ctx.fillStyle = bgColor ?? theme.bgBubble;
  ctx.beginPath();
  drawRoundRect(ctx, left, chipTop, chipWidth, height, height / 2);
  ctx.fill();

  args.spriteManager.drawSprite(
    "bpAsterisk",
    "normal",
    ctx,
    iconLeft,
    yCenter - iconSize / 2,
    iconSize,
    { ...theme, fgIconHeader: textColor ?? theme.textBubble },
  );

  ctx.fillStyle = textColor ?? theme.textBubble;
  ctx.fillText(text, textLeft, yCenter);

  return chipWidth;
};