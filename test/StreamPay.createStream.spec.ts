import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - createStream (Issue #2)", function () {
  async function deployFixture() {
    const [sender, recipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    const amount = ethers.parseEther("100");
    await token.mint(sender.address, amount);
    await token.connect(sender).approve(await sp.getAddress(), amount);

    return { sender, recipient, token, sp, amount };
  }

  it("creates stream successfully", async function () {
    const { sender, recipient, token, sp, amount } = await deployFixture();

    const now = await time.latest();
    const start = now + 10;
    const cliff = start + 100;
    const end = start + 1000;

    await expect(
      sp.connect(sender).createStream(
        await token.getAddress(),
        recipient.address,
        amount,
        start,
        cliff,
        end,
        true
      )
    ).to.emit(sp, "StreamCreated");

    expect(await sp.nextStreamId()).to.equal(2n);
  });

  it("reverts if deposit is zero", async function () {
    const { sender, recipient, token, sp } = await deployFixture();

    const now = await time.latest();

    await expect(
      sp.connect(sender).createStream(
        await token.getAddress(),
        recipient.address,
        0,
        now,
        now,
        now + 100,
        true
      )
    ).to.be.reverted;
  });

  it("reverts on invalid schedule", async function () {
    const { sender, recipient, token, sp, amount } = await deployFixture();

    const now = await time.latest();

    await expect(
      sp.connect(sender).createStream(
        await token.getAddress(),
        recipient.address,
        amount,
        now + 100,
        now,
        now + 1000,
        true
      )
    ).to.be.reverted;
  });

  it("reverts if token or recipient is zero", async function () {
    const { sender, sp, amount } = await deployFixture();

    const now = await time.latest();

    await expect(
      sp.connect(sender).createStream(
        ethers.ZeroAddress,
        sender.address,
        amount,
        now,
        now,
        now + 100,
        true
      )
    ).to.be.reverted;
  });
});

