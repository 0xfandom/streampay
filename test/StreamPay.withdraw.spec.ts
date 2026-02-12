import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - withdraw (Issue #4)", function () {
  async function deployFixture() {
    const [sender, recipient, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    const deposit = ethers.parseEther("100");
    await token.mint(sender.address, deposit);
    await token.connect(sender).approve(await sp.getAddress(), deposit);

    const now = await time.latest();
    const start = now + 10;
    const cliff = start + 50;
    const end = start + 200;

    await sp.connect(sender).createStream(
      await token.getAddress(),
      recipient.address,
      deposit,
      start,
      cliff,
      end,
      true
    );

    const streamId = 1n;

    // move time past cliff
    await time.increaseTo(cliff + 20);

    return { sender, recipient, other, token, sp, deposit, streamId };
  }

  it("recipient can withdraw partially", async function () {
    const { recipient, token, sp, streamId } = await deployFixture();

    const available = await sp.withdrawableAmount(streamId);
    const partial = available / 2n;

    const balanceBefore = await token.balanceOf(recipient.address);

    await expect(
      sp.connect(recipient).withdraw(streamId, partial)
    ).to.emit(sp, "Withdrawn");

    const balanceAfter = await token.balanceOf(recipient.address);

    expect(balanceAfter - balanceBefore).to.equal(partial);

    const remaining = await sp.withdrawableAmount(streamId);
    expect(remaining).to.equal(available - partial);
  });

  it("recipient can withdraw full available amount", async function () {
    const { recipient, token, sp, streamId } = await deployFixture();

    const available = await sp.withdrawableAmount(streamId);

    await sp.connect(recipient).withdraw(streamId, available);

    expect(await sp.withdrawableAmount(streamId)).to.equal(0n);
  });

  it("reverts if non-recipient tries to withdraw", async function () {
    const { other, sp, streamId } = await deployFixture();

    await expect(
      sp.connect(other).withdraw(streamId, 1)
    ).to.be.reverted;
  });

  it("reverts if withdraw amount is zero", async function () {
    const { recipient, sp, streamId } = await deployFixture();

    await expect(
      sp.connect(recipient).withdraw(streamId, 0)
    ).to.be.reverted;
  });

  it("reverts if withdrawing more than available", async function () {
    const { recipient, sp, streamId } = await deployFixture();

    const available = await sp.withdrawableAmount(streamId);

    await expect(
      sp.connect(recipient).withdraw(streamId, available + 1n)
    ).to.be.reverted;
  });

  it("withdraw updates withdrawn accounting correctly", async function () {
    const { recipient, sp, streamId } = await deployFixture();

    const available = await sp.withdrawableAmount(streamId);
    const partial = available / 3n;

    await sp.connect(recipient).withdraw(streamId, partial);

    const stream = await sp.getStream(streamId);
    expect(stream.withdrawn).to.equal(partial);
  });
});
