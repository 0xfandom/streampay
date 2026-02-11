import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StreamPay - vesting math (Issue #3)", function () {
  async function deployFixture() {
    const [sender, recipient] = await ethers.getSigners();

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
    return { sender, recipient, token, sp, deposit, start, cliff, end, streamId };
  }

  it("vested = 0 before start", async function () {
    const { sp, start, streamId } = await deployFixture();
    expect(await sp.vestedAmount(streamId, BigInt(start - 1))).to.equal(0n);
    expect(await sp.vestedAmount(streamId, BigInt(start))).to.equal(0n);
  });

  it("vested = 0 before cliff", async function () {
    const { sp, start, cliff, streamId } = await deployFixture();
    const t = start + 10;
    expect(t).to.be.lessThan(cliff);
    expect(await sp.vestedAmount(streamId, BigInt(t))).to.equal(0n);
  });

  it("vested at cliff is linear from start (>= 0 and deterministic)", async function () {
    const { sp, deposit, start, cliff, end, streamId } = await deployFixture();

    // expected = deposit * (cliff - start) / (end - start)
    const elapsed = BigInt(cliff - start);
    const duration = BigInt(end - start);
    const expected = (deposit * elapsed) / duration;

    const vested = await sp.vestedAmount(streamId, BigInt(cliff));
    expect(vested).to.equal(expected);
    expect(vested).to.be.gt(0n);
  });

  it("vested is linear mid-stream", async function () {
    const { sp, deposit, start, cliff, end, streamId } = await deployFixture();

    const mid = cliff + 40; // safely after cliff, before end
    expect(mid).to.be.lessThan(end);

    const elapsed = BigInt(mid - start);
    const duration = BigInt(end - start);
    const expected = (deposit * elapsed) / duration;

    const vested = await sp.vestedAmount(streamId, BigInt(mid));
    expect(vested).to.equal(expected);
    expect(vested).to.be.lt(deposit);
  });

  it("vested = deposit at/after end", async function () {
    const { sp, deposit, end, streamId } = await deployFixture();

    expect(await sp.vestedAmount(streamId, BigInt(end))).to.equal(deposit);
    expect(await sp.vestedAmount(streamId, BigInt(end + 999))).to.equal(deposit);
  });

  it("withdrawableAmount equals vested(now) when withdrawn=0", async function () {
    const { sp, cliff, streamId } = await deployFixture();

    // jump after cliff
    await time.increaseTo(cliff + 20);

    const now = await time.latest();
    const vestedNow = await sp.vestedAmount(streamId, BigInt(now));
    const withdrawable = await sp.withdrawableAmount(streamId);

    expect(withdrawable).to.equal(vestedNow);
    expect(withdrawable).to.be.gt(0n);
  });

  it("reverts vestedAmount for non-existent stream", async function () {
    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    await expect(sp.vestedAmount(999, 1)).to.be.reverted;
  });
});
